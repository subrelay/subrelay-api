import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { findIndex, get, isEmpty, orderBy } from 'lodash';
import { Chain } from 'src/chain/chain.entity';
import { Task } from 'src/task/entity/task.entity';
import { TaskService } from 'src/task/task.service';
import { ProcessStatus } from 'src/task/type/task.type';
import { DataSource, Repository } from 'typeorm';
import { WorkflowLog } from './entity/workflow-log.entity';
import { WorkflowVersion } from './entity/workflow-version.entity';
import { Workflow } from './entity/workflow.entity';
import {
  CreateWorkFlowRequest,
  GetWorkflowLogsOrderBy,
  GetWorkflowLogsQueryParams,
  GetWorkflowsOrderBy,
  GetWorkflowsQueryParams,
  WorkflowLogResponse,
} from './workflow.dto';
import { WorkflowStatus } from './workflow.type';

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);
  constructor(
    @InjectRepository(Workflow)
    private workflowRepository: Repository<Workflow>,

    @InjectRepository(WorkflowVersion)
    private workflowVersionRepository: Repository<WorkflowVersion>,

    @InjectRepository(WorkflowLog)
    private workflowLogRepository: Repository<WorkflowLog>,

    @InjectDataSource() private dataSource: DataSource,

    private readonly taskService: TaskService,
  ) {}

  async getRunningWorkflows(): Promise<Workflow[]> {
    return await this.getWorkflows({ status: WorkflowStatus.RUNNING });
  }

  async createWorkflowLog(
    input: Pick<WorkflowLog, 'input' | 'workflowVersionId'>,
  ) {
    const { id } = await this.workflowLogRepository.save({
      ...input,
      status: ProcessStatus.RUNNING,
    });
    return id;
  }

  async finishWorkflowLog(id: number, status: ProcessStatus) {
    await this.workflowLogRepository.update(
      { id },
      { status, finishedAt: new Date() },
    );
  }

  async createWorkflow(
    input: CreateWorkFlowRequest,
    userId: number,
  ): Promise<number> {
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
      const workflow = await queryRunner.manager.getRepository(Workflow).save({
        userId,
        status: WorkflowStatus.RUNNING,
      });

      const workflowVersion = await queryRunner.manager
        .getRepository(WorkflowVersion)
        .save({
          workflowId: workflow.id,
          name: input.name,
          chainUuid: input.chainUuid,
        });

      const tasksObject: { [key: string]: number } = {};
      const taskRepo = queryRunner.manager.getRepository(Task);
      for (const taskInput of tasksInput) {
        const { id: taskId } = await taskRepo.save({
          name: taskInput.name,
          type: taskInput.type,
          config: taskInput.config,
          dependOn: get(tasksObject, taskInput.dependOnName),
          workflowVersionId: workflowVersion.id,
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

  async getRunningWorkflowVersionAndTriggerEvents(
    eventIds: number[],
  ): Promise<{ workflowVersionId: number; eventId: number }[]> {
    return this.workflowVersionRepository
      .createQueryBuilder('wv')
      .innerJoin(Task, 't', 't."workflowVersionId" = wv.id')
      .innerJoin(
        Workflow,
        'w',
        `wv."workflowId" = w.id AND w.status = '${WorkflowStatus.RUNNING}'`,
      )
      .where(`config ->> 'eventId' IN (:...eventIds)`, {
        eventIds: eventIds.map((e) => e.toString()),
      })
      .select([
        `wv.id AS "workflowVersionId"`,
        `CAST(coalesce(config ->> 'eventId', '0') AS integer) AS "eventId"`,
      ])
      .distinct()
      .getRawMany();
  }

  getWorkflowSummary(id: number, userId: number): Promise<Workflow> {
    return this.workflowRepository.findOneBy({ id, userId });
  }

  deleteWorkflow(id: number, userId: number) {
    return this.workflowRepository.delete({ id, userId });
  }

  async updateWorkflowStatus(id: number, status: WorkflowStatus) {
    await this.workflowRepository.update({ id }, { status });
  }

  async getWorkflow(id: number, userId?: number): Promise<Workflow> {
    const queryBuilder = this.workflowRepository
      .createQueryBuilder('w')
      .innerJoin(WorkflowVersion, 'wv', 'w.id = wv."workflowId"')
      .innerJoin(Chain, 'c', 'wv."chainUuid" = c.uuid')
      .innerJoin(Task, 't', 't."workflowVersionId" = wv.id')
      .select([
        'w.id AS id',
        'wv.name AS name',
        'w."createdAt" AS "createdAt"',
        'wv."createdAt" AS "updatedAt"',
        'w.status AS status',
        `JSONB_BUILD_OBJECT('uuid', c."uuid", 'name', c.name) AS chain`,
        `ARRAY_AGG(JSONB_BUILD_OBJECT('id', t.id, 'type', t.type, 'name', t.name, 'config', t.config, 'dependOn', t."dependOn")) AS tasks`,
      ])
      .where('w.id = :id', { id })

      .groupBy(
        'w.id, "wv"."name", wv."createdAt", w."createdAt", "w"."status", c.uuid',
      )
      .orderBy('wv."createdAt"', 'DESC');

    if (!isEmpty(userId)) {
      queryBuilder.andWhere('w."userId" = :userId', { userId });
    }

    return queryBuilder.getRawOne();
  }

  async getWorkflows(
    {
      limit,
      offset,
      sort,
      chainUuid,
      order: requestedOrder,
      search,
      status,
    }: Partial<GetWorkflowsQueryParams>,
    userId?: number,
  ): Promise<Workflow[]> {
    let queryBuilder = this.workflowRepository
      .createQueryBuilder('w')
      .innerJoin(WorkflowVersion, 'wv', 'w.id = wv."workflowId"')
      .innerJoin(Chain, 'c', 'wv."chainUuid" = c.uuid');

    if (chainUuid) {
      queryBuilder = queryBuilder.andWhere('c."uuid" = :chainUuid', {
        chainUuid,
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
      queryBuilder = queryBuilder.andWhere('wv."name" ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (limit && offset) {
      queryBuilder = queryBuilder.limit(limit).offset(offset);
    }

    let order;
    switch (requestedOrder) {
      case GetWorkflowsOrderBy.CREATEDAT:
        order = `w."${requestedOrder}"`;
        break;
      case GetWorkflowsOrderBy.UPDATEDAT:
        order = `wv."createdAt"`;
        break;
      case GetWorkflowsOrderBy.NAME:
        order = `wv."${requestedOrder}"`;
        break;
      default:
        order = `wv."${GetWorkflowsOrderBy.NAME}"`;
        break;
    }

    return queryBuilder
      .select([
        'DISTINCT w.id AS id',
        'wv.id AS "workflowVersionId"',
        'wv.name AS name',
        'w."createdAt" AS "createdAt"',
        'wv."createdAt" AS "updatedAt"',
        'w.status AS "status"',
        `JSONB_BUILD_OBJECT('uuid', c.uuid, 'name', c.name, 'chainId', c."chainId") AS chain`,
      ])
      .addOrderBy(order, sort)
      .addOrderBy('wv."createdAt"', 'DESC')
      .getRawMany();
  }

  async getWorkflowLogs(
    {
      limit,
      offset,
      sort: requestedSort,
      chainUuid,
      order: requestedOrder,
      search,
      status,
    }: Partial<GetWorkflowLogsQueryParams>,
    userId: number,
  ): Promise<WorkflowLogResponse[]> {
    let queryBuilder = this.workflowLogRepository
      .createQueryBuilder('wl')
      .innerJoin(WorkflowVersion, 'wv', 'wv.id = wl."workflowVersionId"')
      .innerJoin(
        Workflow,
        'w',
        `w.id = wv."workflowId" AND w."userId" = '${userId}'`,
      )
      .innerJoin(Chain, 'c', 'wv."chainUuid" = c.uuid');

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
      queryBuilder = queryBuilder.andWhere('wv."name" ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (limit && offset) {
      queryBuilder = queryBuilder.limit(limit).offset(offset);
    }

    let order;
    const sort = requestedSort || 'DESC';
    switch (requestedOrder) {
      case GetWorkflowLogsOrderBy.FINISHED_AT:
        order = `wl."${requestedOrder}"`;
        break;
      case GetWorkflowLogsOrderBy.NAME:
        order = `wl."${requestedOrder}"`;
        break;
      case GetWorkflowLogsOrderBy.CHAIN_NAME:
        order = `c."name"`;
        break;
      default:
        order = `wl."${GetWorkflowLogsOrderBy.FINISHED_AT}"`;
        break;
    }

    return queryBuilder
      .select([
        'DISTINCT wl.id AS id',
        'wv.name AS name',
        'wl."finishedAt" AS "finishedAt"',
        'wl."startedAt" AS "startedAt"',
        'wl.status AS "status"',
        `JSONB_BUILD_OBJECT('uuid', c.uuid, 'name', c.name, 'chainId', c."chainId") AS chain`,
      ])
      .addOrderBy(order, sort)
      .getRawMany();
  }

  async getWorkflowLogsTotal(
    { chainUuid, search, status }: Partial<GetWorkflowLogsQueryParams>,
    userId: number,
  ): Promise<number> {
    let queryBuilder = this.workflowLogRepository
      .createQueryBuilder('wl')
      .innerJoin(WorkflowVersion, 'wv', 'wv.id = wl."workflowVersionId"')
      .innerJoin(Chain, 'c', 'wv."chainUuid" = c.uuid')
      .innerJoin(
        Workflow,
        'w',
        `w.id = wv."workflowId" AND w."userId" = '${userId}'`,
      );

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
      queryBuilder = queryBuilder.andWhere('wv."name" ILIKE :search', {
        search: `%${search}%`,
      });
    }

    return queryBuilder.getCount();
  }

  async getWorkflowsTotal(
    {
      limit,
      offset,
      chainUuid,
      search,
      status,
    }: Partial<GetWorkflowsQueryParams>,
    userId?: number,
  ): Promise<number> {
    let queryBuilder = this.workflowRepository
      .createQueryBuilder('w')
      .innerJoin(WorkflowVersion, 'wv', 'w.id = wv."workflowId"')
      .innerJoin(Chain, 'c', 'wv."chainUuid" = c.uuid');

    if (chainUuid) {
      queryBuilder = queryBuilder.andWhere('c."uuid" = :chainUuid', {
        chainUuid,
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
      queryBuilder = queryBuilder.andWhere('wv."name" ILIKE :search', {
        search: `%${search}%`,
      });
    }

    if (limit && offset) {
      queryBuilder = queryBuilder.limit(limit).offset(offset);
    }

    return queryBuilder.getCount();
  }
}
