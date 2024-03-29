import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { find, get, isNil, isNull } from 'lodash';
import { Repository } from 'typeorm';
import { ChainEntity } from '../chain/chain.entity';
import { TaskService } from '../task/task.service';
import {
  BaseTask,
  TaskStatus,
  TaskLog,
  TaskType,
} from '../task/type/task.type';
import { WorkflowLogEntity } from './entity/workflow-log.entity';
import { WorkflowEntity } from './entity/workflow.entity';
import {
  GetWorkflowLogsOrderBy,
  GetWorkflowLogsQueryParams,
  GetWorkflowsOrderBy,
  GetWorkflowsQueryParams,
  UpdateWorkflowRequest,
  WorkflowTaskInput,
} from './workflow.dto';
import {
  ProcessWorkflowInput,
  Workflow,
  WorkflowLogSummary,
  WorkflowStatus,
} from './workflow.type';
import { ulid } from 'ulid';
import { EventEntity } from '../event/event.entity';
import { encryptText } from '../common/crypto.util';
import { ConfigService } from '@nestjs/config';
import { SortType } from '../common/pagination.type';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);
  constructor(
    @InjectRepository(WorkflowEntity)
    private workflowRepository: Repository<WorkflowEntity>,

    @InjectRepository(WorkflowLogEntity)
    private workflowLogRepository: Repository<WorkflowLogEntity>,

    private readonly taskService: TaskService,
    private readonly configService: ConfigService,
  ) {}

  async processWorkflow(
    input: ProcessWorkflowInput,
    schema: { [dependTaskId: string]: BaseTask },
    output: { [key: string]: TaskLog } = {},
    parentTaskId = 'start',
  ): Promise<{ [key: string]: TaskLog }> {
    const task = schema[parentTaskId];

    const result = await this.taskService.processTask(task, input);
    output[task.id] = result;

    if (result.status === TaskStatus.FAILED) {
      // Task is failed
      return output;
    }

    if (task.type === TaskType.FILTER && result.output?.match === false) {
      // Event does not match with filter
      return output;
    }

    if (!schema[task.id]) {
      // This is final task
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
    name: string,
    tasks: WorkflowTaskInput[],
    userId: string,
  ): Promise<Workflow> {
    let workflowId;

    try {
      const { eventId } = find(tasks, { type: TaskType.TRIGGER }).config;
      const workflow = await this.workflowRepository.save({
        id: ulid(),
        userId,
        status: WorkflowStatus.RUNNING,
        name,
        eventId,
        updatedAt: new Date(),
      });
      workflowId = workflow.id;

      const tasksObject: { [key: string]: string } = {};

      for (const taskInput of tasks) {
        if (taskInput.type === TaskType.WEBHOOK) {
          const webhookSecretKey = this.configService.get('WEBHOOK_SECRET_KEY');
          taskInput.config = {
            ...taskInput.config,
            secret:
              taskInput.config.secret &&
              encryptText(taskInput.config.secret, webhookSecretKey),
            encrypted: !isNil(taskInput.config.secret),
          };
        }

        const { id: taskId } = await this.taskService.createTask({
          id: ulid(),
          name: taskInput.name,
          type: taskInput.type,
          config: taskInput.config,
          dependOn: get(tasksObject, taskInput.dependOnName),
          workflowId: workflow.id,
        });

        Object.assign(tasksObject, { [taskInput.name]: taskId });
      }

      return await this.getWorkflow(workflowId, userId);
    } catch (err) {
      this.logger.error('Failed to create workflow', err);

      if (workflowId) {
        await this.workflowRepository.delete({ id: workflowId });
      }

      throw err;
    }
  }

  async getRunningWorkflowsByEventIds(eventIds: string[]): Promise<Workflow[]> {
    return this.getWorkflowQueryBuilder()
      .where('w.status = :status', {
        status: WorkflowStatus.RUNNING,
      })
      .andWhere('w."eventId" IN (:...eventIds)', { eventIds })
      .getRawMany();
  }

  async getRunningWorkflows(): Promise<Workflow[]> {
    return this.getWorkflowQueryBuilder()
      .where('status = :status', {
        status: WorkflowStatus.RUNNING,
      })
      .getRawMany();
  }

  async workflowExists(id: string, userId: string): Promise<boolean> {
    return (await this.workflowRepository.countBy({ id, userId })) > 0;
  }

  async deleteWorkflow(id: string, userId: string) {
    await this.workflowRepository.delete({ id, userId });
  }

  async updateWorkflow(id: string, input: UpdateWorkflowRequest) {
    await this.workflowRepository.update(
      { id },
      { status: input.status, name: input.name, updatedAt: new Date() },
    );
  }

  async getWorkflowLog(
    workflowLogId: string,
    userId?: string,
  ): Promise<WorkflowLogSummary> {
    const queryBuilder = await this.getWorkflowLogQueryBuilder();
    queryBuilder.andWhere('wl.id = :workflowLogId', { workflowLogId });

    if (!isNil(userId)) {
      queryBuilder.andWhere('w."userId" = :userId', { userId });
    }

    return queryBuilder.getRawOne();
  }

  async getWorkflow(workflowId: string, userId?: string): Promise<Workflow> {
    const queryBuilder = await this.getWorkflowQueryBuilder();
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
  ): Promise<{ workflows: Workflow[]; total: number }> {
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

    const order = `w."${requestedOrder || GetWorkflowsOrderBy.UPDATED_AT}"`;
    queryBuilder = queryBuilder.addOrderBy(order, sort || SortType.DESC);

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
    userId: string,
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
        order = `w."${requestedOrder}"`;
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
      .innerJoin(EventEntity, 'e', `e.id = w."eventId"`)
      .innerJoin(ChainEntity, 'c', 'e."chainUuid" = c.uuid')
      .where('wl.status IN (:...statuses) ', {
        statuses: [TaskStatus.FAILED, TaskStatus.SUCCESS],
      })
      .select([
        'DISTINCT wl.id AS id',
        'wl."finishedAt" AS "finishedAt"',
        'wl."startedAt" AS "startedAt"',
        'wl.status AS "status"',
        `JSONB_BUILD_OBJECT('uuid', c.uuid, 'name', c.name, 'imageUrl', c."imageUrl") AS chain`,
        `JSONB_BUILD_OBJECT('id', e.id, 'name', e.name, 'description', e.description) AS event`,
        `JSONB_BUILD_OBJECT('id', w.id, 'name', w.name) AS workflow`,
      ]);
  }

  private getWorkflowQueryBuilder() {
    return this.workflowRepository
      .createQueryBuilder('w')
      .innerJoin(EventEntity, 'e', 'e.id = w."eventId"')
      .innerJoin(ChainEntity, 'c', 'e."chainUuid" = c.uuid')
      .select([
        'DISTINCT w.id AS id',
        'w.name AS name',
        'w."createdAt" AS "createdAt"',
        'w."updatedAt" AS "updatedAt"',
        'w.status AS "status"',
        'w."userId" AS "userId"',
        `JSONB_BUILD_OBJECT('uuid', c.uuid, 'name', c.name, 'chainId', c."chainId", 'imageUrl', c."imageUrl") AS chain`,
        `JSONB_BUILD_OBJECT('id', e.id, 'name', e.name, 'description', e.description) AS event`,
      ]);
  }
}
