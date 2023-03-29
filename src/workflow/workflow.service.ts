import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { findIndex, get, isNil, isNull, orderBy } from 'lodash';
import { DataSource, In, Repository } from 'typeorm';
import { ChainEntity } from '../chain/chain.entity';
import { TaskEntity } from '../task/entity/task.entity';
import { ProcessTaskInput } from '../task/task.dto';
import { TaskService } from '../task/task.service';
import { BaseTask, TaskStatus, TaskLog } from '../task/type/task.type';
import { WorkflowLogEntity } from './entity/workflow-log.entity';
import { WorkflowEntity } from './entity/workflow.entity';
import {
  CreateWorkFlowRequest,
  GetWorkflowLogsOrderBy,
  GetWorkflowLogsQueryParams,
  GetWorkflowsOrderBy,
  GetWorkflowsQueryParams,
  UpdateWorkflowRequest,
} from './workflow.dto';
import {
  ProcessWorkflowInput,
  WorkflowLogSummary,
  WorkflowStatus,
  WorkflowSummary,
} from './workflow.type';
import { ulid } from 'ulid';
import { EventEntity } from '../event/event.entity';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);
  constructor(
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,

    @InjectRepository(WorkflowLogEntity)
    private workflowLogRepository: Repository<WorkflowLogEntity>,

    @InjectDataSource() private dataSource: DataSource,

    private readonly taskService: TaskService,
  ) {}

  async processWorkflow(
    input: ProcessWorkflowInput,
    schema: { [dependTaskId: number]: BaseTask },
    output: { [key: number]: TaskLog } = {},
    parentTaskId: string = 'start',
  ): Promise<{ [key: number]: TaskLog }> {
    const task = schema[parentTaskId];

    const result = await this.taskService.processTask(task, input);
    if (result.success && result.output?.match === false) {
      // Trigger task does not match
      return {};
    }

    output[task.id] = result;
    if (!result.success || !schema[task.id]) {
      // Task is failed
      return output;
    }

    return this.processWorkflow(input, schema, output, task.id);
  }

  async createWorkflowLog({
    input,
    workflowId,
  }: Pick<WorkflowLogEntity, 'input' | 'workflowId'>) {
    const { id } = await this.workflowLogRepository.save({
      id: ulid(),
      workflowId,
      status: TaskStatus.RUNNING,
      input,
    });

    return id;
  }

  async finishWorkflowLog(id: string, status: TaskStatus) {
    await this.workflowLogRepository.update(
      { id },
      { status, finishedAt: new Date() },
    );
  }

  async createWorkflow(
    input: CreateWorkFlowRequest,
    userId: string,
  ): Promise<string> {
    const tasksInput = orderBy(
      input.tasks.map((task) => ({
        ...task,
        dependOnIndex: findIndex(input.tasks, { name: task.dependOnName }),
      })),
      ['dependOnIndex'],
      ['asc'],
    );
    let err;
    let workflowId;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const workflow = await queryRunner.manager
        .getRepository(WorkflowEntity)
        .save({
          userId,
          status: WorkflowStatus.RUNNING,
          name: input.name,
          eventId: input.eventId,
        });

      const tasksObject: { [key: string]: number } = {};
      const taskRepo = queryRunner.manager.getRepository(TaskEntity);
      for (const taskInput of tasksInput) {
        const { id: taskId } = await taskRepo.save({
          name: taskInput.name,
          type: taskInput.type,
          config: taskInput.config,
          dependOn: get(tasksObject, taskInput.dependOnName),
          workflowId: workflow.id,
        });
        Object.assign(tasksObject, { [taskInput.name]: taskId });
      }

      await queryRunner.commitTransaction();
      workflowId = workflow.id;
    } catch (err) {
      err = err;
      this.logger.error('Failed to create workflow', err);
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }

    if (err) {
      throw err;
    }

    return workflowId;
  }

  async getRunningWorkflowsByEventIds(
    eventIds: string[],
  ): Promise<WorkflowEntity[]> {
    return this.workflowRepository.find({
      where: {
        eventId: In(eventIds),
        status: WorkflowStatus.RUNNING,
      },
      relations: {
        event: true,
      },
    });
  }

  async workflowExists(id: string, userId: string): Promise<boolean> {
    return (await this.workflowRepository.countBy({ id, userId })) > 0;
  }

  deleteWorkflow(id: string, userId: string) {
    return this.workflowRepository.delete({ id, userId });
  }

  async updateWorkflowStatus(id: string, input: UpdateWorkflowRequest) {
    await this.workflowRepository.update(
      { id },
      { status: input.status, name: input.name },
    );
  }

  async getWorkflowLog(
    workflowLogId: string,
    userId?: number,
  ): Promise<WorkflowLogSummary> {
    let queryBuilder = await this.getWorkflowLogQueryBuilder();
    queryBuilder.andWhere('wl.id = :workflowLogId', { workflowLogId });

    if (!isNil(userId)) {
      queryBuilder.andWhere('w."userId" = :userId', { userId });
    }

    return queryBuilder.getRawOne();
  }

  async getWorkflowSummary(
    workflowId: string,
    userId?: string,
  ): Promise<WorkflowSummary> {
    let queryBuilder = await this.getWorkflowQueryBuilder();
    queryBuilder.andWhere('w.id = :workflowId', { workflowId });

    if (!isNil(userId)) {
      queryBuilder.andWhere('w."userId" = :userId', { userId });
    }

    return queryBuilder.getRawOne();
  }

  async getWorkflowsAndTotal(
    {
      limit,
      offset,
      sort,
      chainUuid,
      order: requestedOrder,
      search,
      status,
      id,
    }: Partial<GetWorkflowsQueryParams>,
    userId?: string,
  ): Promise<{ workflows: WorkflowSummary[]; total: number }> {
    let queryBuilder = this.getWorkflowQueryBuilder();

    if (chainUuid) {
      queryBuilder = queryBuilder.andWhere('c."uuid" = :chainUuid', {
        chainUuid,
      });
    }

    if (id) {
      queryBuilder = queryBuilder.andWhere('w."id" = :id', {
        id,
      });
    }

    if (userId) {
      queryBuilder = queryBuilder.andWhere('w."userId" = :userId', {
        userId,
      });
    }

    if (status) {
      queryBuilder = queryBuilder.andWhere('w."status" = :status', {
        status,
      });
    }

    if (search) {
      queryBuilder = queryBuilder.andWhere('w."name" ILIKE :search', {
        search: `%${search}%`,
      });
    }

    let order;
    switch (requestedOrder) {
      case GetWorkflowsOrderBy.CREATEDAT:
        order = `w."${requestedOrder}"`;
        break;
      case GetWorkflowsOrderBy.UPDATEDAT:
        order = `w."createdAt"`;
        break;
      case GetWorkflowsOrderBy.NAME:
        order = `w."${requestedOrder}"`;
        break;
      default:
        order = `w."${GetWorkflowsOrderBy.NAME}"`;
        break;
    }
    queryBuilder = queryBuilder
      .addOrderBy(order, sort)
      .addOrderBy('wv."createdAt"', 'DESC');

    const total = await queryBuilder.getCount();

    if (!isNull(limit) && !isNull(offset)) {
      queryBuilder = queryBuilder.limit(limit).offset(offset);
    }

    const workflows = await queryBuilder.getRawMany();

    return { workflows, total };
  }

  async getWorkflowLogsAndTotal(
    {
      limit,
      offset,
      sort: requestedSort,
      chainUuid,
      order: requestedOrder,
      search,
      status,
      workflowId,
      id,
    }: Partial<GetWorkflowLogsQueryParams>,
    userId: number,
  ): Promise<{ workflowLogs: WorkflowLogSummary[]; total: number }> {
    let queryBuilder = this.getWorkflowLogQueryBuilder();
    queryBuilder.andWhere('w."userId" = :userId', {
      userId,
    });

    if (chainUuid) {
      queryBuilder = queryBuilder.andWhere('c."uuid" = :chainUuid', {
        chainUuid,
      });
    }

    if (status) {
      queryBuilder = queryBuilder.andWhere('wl."status" = :status', {
        status,
      });
    }

    if (search) {
      queryBuilder = queryBuilder.andWhere('w."name" ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (!isNil(workflowId)) {
      queryBuilder = queryBuilder.andWhere('w."id" = :workflowId', {
        workflowId,
      });
    }

    if (!isNil(id)) {
      queryBuilder = queryBuilder.andWhere('wl."id" = :id', {
        id,
      });
    }

    let order;
    const sort = requestedSort || 'DESC';
    switch (requestedOrder) {
      case GetWorkflowLogsOrderBy.FINISHED_AT:
        order = `wl."${requestedOrder}"`;
        break;
      case GetWorkflowLogsOrderBy.NAME:
        order = `wv."${requestedOrder}"`;
        break;
      case GetWorkflowLogsOrderBy.STARTED_AT:
        order = `wl."${requestedOrder}"`;
        break;
      default:
        order = `wl."${GetWorkflowLogsOrderBy.FINISHED_AT}"`;
        break;
    }
    queryBuilder = queryBuilder.addOrderBy(order, sort);

    const total = await queryBuilder.getCount();

    if (!isNil(limit) && !isNil(offset)) {
      queryBuilder = queryBuilder.limit(limit).offset(offset);
    }

    const workflowLogs = await queryBuilder.getRawMany();

    return { workflowLogs, total };
  }

  private getWorkflowLogQueryBuilder() {
    return this.workflowLogRepository
      .createQueryBuilder('wl')
      .innerJoin(WorkflowEntity, 'w', `w.id = wl."workflowId"`)
      .innerJoin(ChainEntity, 'c', 'wv."chainUuid" = c.uuid')
      .where('wl.status IN (:...statuses) ', {
        statuses: [TaskStatus.FAILED, TaskStatus.SUCCESS],
      })
      .select([
        'DISTINCT wl.id AS id',
        'wl."finishedAt" AS "finishedAt"',
        'wl."startedAt" AS "startedAt"',
        'wl.status AS "status"',
        'wl.input AS "input"',
        `JSONB_BUILD_OBJECT('uuid', c.uuid, 'name', c.name, 'imageUrl', c."imageUrl") AS chain`,
        `JSONB_BUILD_OBJECT('id', w.id, 'name', w.name, 'name') AS workflow`,
      ]);
  }

  private getWorkflowQueryBuilder() {
    return this.workflowRepository
      .createQueryBuilder('w')
      .innerJoin(EventEntity, 'e', 'e.id = w."eventId"')
      .innerJoin(ChainEntity, 'c', 'e."chainUuid" = c.id')
      .select([
        'DISTINCT w.id AS id',
        'w.name AS name',
        'w."createdAt" AS "createdAt"',
        'w."createdAt" AS "updatedAt"',
        'w.status AS "status"',
        `JSONB_BUILD_OBJECT('uuid', c.uuid, 'name', c.name, 'chainId', c."chainId") AS chain`,
        `JSONB_BUILD_OBJECT('id', e.id, 'name', e.name, 'chain', JSONB_BUILD_OBJECT('uuid', c.uuid, 'name', c.name, 'chainId', c."chainId")) AS event`,
      ]);
  }
}
