import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { findIndex, get, orderBy } from 'lodash';
import { Chain } from 'src/chain/chain.entity';
import { Task } from 'src/task/entity/task.entity';
import { TaskService } from 'src/task/task.service';
import { DataSource, Repository } from 'typeorm';
import { WorkflowVersion } from './entity/workflow-version.entity';
import { Workflow } from './entity/workflow.entity';
import {
  CreateWorkFlowRequest,
  GetWorkflowsOrderBy,
  GetWorkflowsQueryParams,
} from './workflow.dto';
import { WorkflowStatus } from './workflow.type';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(Workflow)
    private workflowRepository: Repository<Workflow>,

    @InjectDataSource() private dataSource: DataSource,

    private readonly taskService: TaskService,
  ) {}

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

      console.log({ workflow });

      const workflowVersion = await queryRunner.manager
        .getRepository(WorkflowVersion)
        .save({
          workflowId: workflow.id,
          name: input.name,
          chainUuid: input.chainUuid,
        });

      console.log({ workflowVersion });

      const tasksObject: { [key: string]: number } = {};
      const taskRepo = queryRunner.manager.getRepository(Task);
      for (const taskInput of tasksInput) {
        console.log({ tasksObject });

        console.log({
          name: taskInput.name,
          type: taskInput.type,
          config: taskInput.config,
          dependOn: get(tasksObject, taskInput.dependOnName),
          workflowVersionId: workflowVersion.id,
        });

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
      console.log('Failed to create workflow');
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }

    if (err) {
      throw err;
    }

    return workflowId;
  }

  getWorkflowSummary(id: number, userId: number): Promise<Workflow> {
    return this.workflowRepository.findOneBy({ id, userId });
  }

  async updateWorkflowStatus(id: number, status: WorkflowStatus) {
    await this.workflowRepository.update({ id }, { status });
  }

  async getWorkflow(id: number, userId: number): Promise<Workflow> {
    console.log(await this.workflowRepository.find());

    return await this.workflowRepository
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
      .andWhere('w."userId" = :userId', { userId })
      .groupBy(
        'w.id, "wv"."name", wv."createdAt", w."createdAt", "w"."status", c.uuid',
      )
      .orderBy('wv."createdAt"', 'DESC')
      .getRawOne();
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
    }: GetWorkflowsQueryParams,
    userId: number,
  ): Promise<{
    workflows: Workflow[];
    total: number;
  }> {
    let queryBuilder = this.workflowRepository
      .createQueryBuilder('w')
      .innerJoin(WorkflowVersion, 'wv', 'w.id = wv."workflowId"')
      .innerJoin(Chain, 'c', 'wv."chainUuid" = c.uuid')
      .where({ userId });

    if (chainUuid) {
      queryBuilder = queryBuilder.andWhere('c."uuid" = :chainUuid', {
        chainUuid,
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
        break;
    }

    const total = await queryBuilder.getCount();

    const workflows = await queryBuilder
      .select([
        'DISTINCT w.id AS id',
        'wv.name AS name',
        'w."createdAt" AS "createdAt"',
        'wv."createdAt" AS "updatedAt"',
        'w.status AS "status"',
        `JSONB_BUILD_OBJECT('uuid', c.uuid, 'name', c.name) AS chain`,
      ])
      .addOrderBy(order, sort)
      .addOrderBy('wv."createdAt"', 'DESC')
      .limit(limit)
      .offset(offset)
      .getRawMany();

    return {
      workflows,
      total,
    };
  }
}
