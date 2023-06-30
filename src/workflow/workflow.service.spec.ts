import { Repository } from 'typeorm';
import { WorkflowService } from './workflow.service';
import { WorkflowEntity } from './entity/workflow.entity';
import { WorkflowLogEntity } from './entity/workflow-log.entity';
import { TaskService } from '../task/task.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ulid } from 'ulid';
import { BaseTask, TaskStatus } from '../task/type/task.type';
import {
  mockChainEntity,
  mockEmailTask,
  mockEvent,
  mockEventEntity,
  mockFilterTask,
  mockTriggerTask,
  mockUserEntity,
  mockWebhookTask,
  mockWorkflowEntity,
  mockWorkflowLogSummary,
} from '../../test/mock-data.util';
import { GetWorkflowLogsOrderBy, WorkflowTaskInput } from './workflow.dto';
import * as CryptoUtil from '../common/crypto.util';
import {
  ProcessWorkflowInput,
  WorkflowLogSummary,
  WorkflowStatus,
} from './workflow.type';
import { WebhookTaskConfig } from '../task/type/webhook.type';

jest.mock('../common/crypto.util');

describe('WorkflowService', () => {
  let service: WorkflowService;
  let workflowRepository: Repository<WorkflowEntity>;
  let workflowLogRepository: Repository<WorkflowLogEntity>;
  let taskService: TaskService;

  const chain = mockChainEntity();
  const event = mockEventEntity(chain.uuid);
  const workflowId = ulid();
  const user = mockUserEntity();
  const triggerTask = mockTriggerTask('eventId', workflowId);
  const emailTask = mockEmailTask(workflowId, triggerTask.id);
  const workflowEntity: WorkflowEntity = {
    id: workflowId,
    name: 'Dot webhook',
    createdAt: new Date('2023-06-19T02:37:30.588Z'),
    updatedAt: new Date('2023-06-19T09:37:30.590Z'),
    status: WorkflowStatus.RUNNING,
    userId: 'user123',
    event: event,
    eventId: event.id,
    user,
  };
  const expectedWorkflow = {
    id: workflowId,
    name: workflowEntity.name,
    userId: user.id,
    createdAt: workflowEntity.createdAt,
    updatedAt: workflowEntity.updatedAt,
    status: workflowEntity.status,
    event: {
      id: event.id,
      name: event.name,
      description: event.description,
    },
    chain: {
      uuid: chain.uuid,
      name: chain.name,
      imageUrl: chain.imageUrl,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        {
          provide: TaskService,
          useValue: {
            createTask: jest.fn(),
            processTask: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test'),
          },
        },
        {
          provide: getRepositoryToken(WorkflowEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(WorkflowLogEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
    workflowRepository = module.get<Repository<WorkflowEntity>>(
      getRepositoryToken(WorkflowEntity),
    );
    workflowLogRepository = module.get<Repository<WorkflowLogEntity>>(
      getRepositoryToken(WorkflowLogEntity),
    );
    taskService = module.get<TaskService>(TaskService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWorkflowLog', () => {
    it('should create a workflow log with the given input and workflowId', async () => {
      const input = {};
      const workflow = mockWorkflowEntity();
      const workflowLog: WorkflowLogEntity = {
        id: ulid(),
        startedAt: new Date(),
        finishedAt: new Date(),
        status: TaskStatus.SUCCESS,
        input: {},
        workflow,
        workflowId: workflow.id,
      };
      jest
        .spyOn(workflowLogRepository, 'save')
        .mockResolvedValueOnce(workflowLog);

      const result = await service.createWorkflowLog({
        input,
        workflowId: workflowLog.workflow.id,
      });

      expect(result).toEqual(workflowLog.id);
    });
  });

  describe('createWorkflow', () => {
    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should create a workflow with valid inputs', async () => {
      const tasksInput: WorkflowTaskInput[] = [
        { ...triggerTask, dependOnIndex: -2 },
        {
          ...emailTask,
          dependOnName: triggerTask.name,
          dependOnIndex: 0,
        },
      ];

      jest
        .spyOn(workflowRepository, 'save')
        .mockResolvedValueOnce(workflowEntity);
      jest.spyOn(taskService, 'createTask').mockImplementation((input) => {
        return Promise.resolve(input);
      });
      jest
        .spyOn(service, 'getWorkflow')
        .mockResolvedValueOnce(expectedWorkflow);

      const workflow = await service.createWorkflow(
        workflowEntity.name,
        tasksInput,
        user.id,
      );

      expect(workflow).toEqual(expectedWorkflow);
      expect(CryptoUtil.encryptText).not.toHaveBeenCalled();
    });

    it('should create a workflow with secret webhook task', async () => {
      const webhookTask = mockWebhookTask(workflowId, triggerTask.id);
      webhookTask.config = {
        secret: ulid(),
        url: 'https://example.com',
      } as WebhookTaskConfig;
      const tasksInput: WorkflowTaskInput[] = [
        { ...triggerTask, dependOnIndex: -2 },
        {
          ...webhookTask,
          dependOnName: triggerTask.name,
          dependOnIndex: 0,
        },
      ];
      jest
        .spyOn(workflowRepository, 'save')
        .mockResolvedValueOnce(workflowEntity);
      jest.spyOn(taskService, 'createTask').mockImplementation((input) => {
        return Promise.resolve(input);
      });
      jest
        .spyOn(service, 'getWorkflow')
        .mockResolvedValueOnce(expectedWorkflow);

      await service.createWorkflow(
        expectedWorkflow.name,
        tasksInput,
        expectedWorkflow.userId,
      );

      expect(CryptoUtil.encryptText).toHaveBeenCalledWith(
        webhookTask.config.secret,
        'test',
      );
    });

    it('should throw error when getting an error', async () => {
      const webhookTask = mockWebhookTask(workflowId, triggerTask.id);
      webhookTask.config = {
        secret: ulid(),
        url: 'https://example.com',
      } as WebhookTaskConfig;
      const tasksInput: WorkflowTaskInput[] = [
        { ...triggerTask, dependOnIndex: -2 },
        {
          ...webhookTask,
          dependOnName: triggerTask.name,
          dependOnIndex: 0,
        },
      ];
      const error = new Error('error');
      jest.spyOn(workflowRepository, 'save').mockRejectedValueOnce(error);
      jest.spyOn(workflowRepository, 'delete').mockResolvedValueOnce(undefined);

      await expect(
        service.createWorkflow(
          expectedWorkflow.name,
          tasksInput,
          expectedWorkflow.userId,
        ),
      ).rejects.toThrow(error.message);
      expect(workflowRepository.delete).not.toHaveBeenCalled();
    });

    it('should delete all data when getting an error when creating a workflow', async () => {
      const webhookTask = mockWebhookTask(workflowId, triggerTask.id);
      webhookTask.config = {
        secret: ulid(),
        url: 'https://example.com',
      } as WebhookTaskConfig;
      const tasksInput: WorkflowTaskInput[] = [
        { ...triggerTask, dependOnIndex: -2 },
        {
          ...webhookTask,
          dependOnName: triggerTask.name,
          dependOnIndex: 0,
        },
      ];
      const error = new Error('error');
      jest
        .spyOn(workflowRepository, 'save')
        .mockResolvedValueOnce(workflowEntity);
      jest.spyOn(workflowRepository, 'delete').mockResolvedValueOnce(undefined);
      jest.spyOn(taskService, 'createTask').mockRejectedValue(error);

      await expect(
        service.createWorkflow(
          expectedWorkflow.name,
          tasksInput,
          expectedWorkflow.userId,
        ),
      ).rejects.toThrow(error.message);
      expect(workflowRepository.delete).toHaveBeenCalledWith({
        id: workflowEntity.id,
      });
    });
  });

  describe('finishWorkflowLog', () => {
    it('should update the workflow log with the provided status and finishedAt date', async () => {
      const id = 'test';
      const status = TaskStatus.SUCCESS;

      jest
        .spyOn(workflowLogRepository, 'update')
        .mockResolvedValueOnce(undefined);

      await service.finishWorkflowLog(id, status);

      expect(workflowLogRepository.update).toHaveBeenCalledWith(
        { id },
        { status, finishedAt: expect.any(Date) },
      );
    });
  });

  describe('getRunningWorkflowsByEventIds', () => {
    it('should return an array of running workflows', async () => {
      jest.spyOn(workflowRepository, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValueOnce([expectedWorkflow]),
      } as any);

      const result = await service.getRunningWorkflowsByEventIds([event.id]);

      expect(result).toEqual([expectedWorkflow]);

      expect(
        workflowRepository.createQueryBuilder().where,
      ).toHaveBeenCalledWith('w.status = :status', {
        status: WorkflowStatus.RUNNING,
      });
      expect(
        workflowRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."eventId" IN (:...eventIds)', {
        eventIds: [event.id],
      });
    });
  });

  describe('getRunningWorkflows', () => {
    it('should return an array of running workflows', async () => {
      jest.spyOn(workflowRepository, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValueOnce([expectedWorkflow]),
      } as any);

      const result = await service.getRunningWorkflows();
      expect(result).toEqual([expectedWorkflow]);

      expect(
        workflowRepository.createQueryBuilder().where,
      ).toHaveBeenCalledWith('status = :status', {
        status: WorkflowStatus.RUNNING,
      });
    });
  });

  describe('workflowExists', () => {
    it('should return true if workflow with given id and userId exists', async () => {
      const id = '123';
      const userId = '456';
      jest.spyOn(workflowRepository, 'countBy').mockResolvedValue(1);

      const result = await service.workflowExists(id, userId);

      expect(result).toBe(true);
      expect(workflowRepository.countBy).toHaveBeenCalledWith({ id, userId });
    });

    it('should return false if workflow with given id and userId does not exist', async () => {
      const id = '123';
      const userId = '456';
      jest.spyOn(workflowRepository, 'countBy').mockResolvedValue(0);

      const result = await service.workflowExists(id, userId);

      expect(result).toBe(false);
      expect(workflowRepository.countBy).toHaveBeenCalledWith({ id, userId });
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete workflow with correct id and userId', async () => {
      const id = 'testId';
      const userId = 'testUserId';

      jest.spyOn(workflowRepository, 'delete').mockResolvedValue(undefined);

      await service.deleteWorkflow(id, userId);

      expect(workflowRepository.delete).toHaveBeenCalledWith({ id, userId });
    });
  });

  describe('updateWorkflow', () => {
    it('should update the workflow with the given id', async () => {
      const id = 'workflow_id';
      const input = { status: WorkflowStatus.PAUSING, name: 'new_name' };

      jest.spyOn(workflowRepository, 'update').mockResolvedValue(undefined);

      await service.updateWorkflow(id, input);

      expect(workflowRepository.update).toHaveBeenCalledWith(
        { id },
        { ...input, updatedAt: expect.any(Date) },
      );
    });
  });

  describe('getWorkflowLog', () => {
    it('should return a WorkflowLogSummary object when no userId is provided', async () => {
      const workflowSummary: WorkflowLogSummary =
        mockWorkflowLogSummary(expectedWorkflow);

      jest.spyOn(workflowLogRepository, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValueOnce(workflowSummary),
      } as any);
      const result = await service.getWorkflowLog(workflowSummary.id);

      expect(result).toEqual(workflowSummary);
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('wl.id = :workflowLogId', {
        workflowLogId: workflowSummary.id,
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."userId" = :userId', { userId: user.id });
      expect(
        workflowLogRepository.createQueryBuilder().getRawOne,
      ).toHaveBeenCalled();
    });

    it('should return a WorkflowLogSummary object when userId is provided', async () => {
      const workflowSummary: WorkflowLogSummary =
        mockWorkflowLogSummary(expectedWorkflow);
      jest.spyOn(workflowLogRepository, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValueOnce(workflowSummary),
      } as any);
      const result = await service.getWorkflowLog(workflowSummary.id, user.id);

      expect(result).toEqual(workflowSummary);
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('wl.id = :workflowLogId', {
        workflowLogId: workflowSummary.id,
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."userId" = :userId', { userId: user.id });
      expect(
        workflowLogRepository.createQueryBuilder().getRawOne,
      ).toHaveBeenCalled();
    });
  });

  describe('getWorkflow', () => {
    it('should return a Workflow object with the specified workflowId', async () => {
      jest.spyOn(workflowRepository, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValueOnce(expectedWorkflow),
      } as any);

      const workflow = await service.getWorkflow(expectedWorkflow.id);
      expect(workflow).toEqual(expectedWorkflow);
      expect(
        workflowRepository.createQueryBuilder().getRawOne,
      ).toHaveBeenCalled();
      expect(
        workflowRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w.id = :workflowId', {
        workflowId: expectedWorkflow.id,
      });
      expect(
        workflowRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."userId" = :userId', { userId: user.id });
    });

    it('should return a Workflow object with the specified workflowId and userId', async () => {
      jest.spyOn(workflowRepository, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValueOnce(expectedWorkflow),
      } as any);

      const workflow = await service.getWorkflow(expectedWorkflow.id, user.id);
      expect(workflow).toEqual(expectedWorkflow);
      expect(
        workflowRepository.createQueryBuilder().getRawOne,
      ).toHaveBeenCalled();
      expect(
        workflowRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w.id = :workflowId', {
        workflowId: expectedWorkflow.id,
      });
      expect(
        workflowRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."userId" = :userId', { userId: user.id });
    });

    it('should return null when workflowId is not found', async () => {
      jest.spyOn(workflowRepository, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValueOnce(null),
      } as any);

      const workflow = await service.getWorkflow(expectedWorkflow.id);
      expect(workflow).toBeNull();
    });
  });

  describe('getWorkflowsAndTotal', () => {
    beforeEach(() => {
      jest.spyOn(workflowRepository, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([expectedWorkflow]),
        getCount: jest.fn().mockResolvedValue(1),
      } as any);
    });

    it('should workflows and total count when no filter parameters are provided', async () => {
      const result = await service.getWorkflowsAndTotal({});
      expect(result).toEqual({
        workflows: [expectedWorkflow],
        total: 1,
      });
      expect(
        workflowRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalled();
      expect(
        workflowRepository.createQueryBuilder().getCount,
      ).toHaveBeenCalled();
      expect(
        workflowRepository.createQueryBuilder().addOrderBy,
      ).toHaveBeenCalledWith('w."updatedAt"', 'DESC');
    });

    it('should return workflows and total count when filtering by chainUuid', async () => {
      const result = await service.getWorkflowsAndTotal({
        chainUuid: expectedWorkflow.chain.uuid,
      });
      expect(result).toEqual({
        workflows: [expectedWorkflow],
        total: 1,
      });
      expect(
        workflowRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('c."uuid" = :chainUuid', {
        chainUuid: expectedWorkflow.chain.uuid,
      });
    });

    it('should return workflows and total count when filtering by id', async () => {
      const result = await service.getWorkflowsAndTotal({
        id: expectedWorkflow.id,
      });
      expect(result).toEqual({
        workflows: [expectedWorkflow],
        total: 1,
      });
      expect(
        workflowRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."id" = :id', {
        id: expectedWorkflow.id,
      });
    });

    it('should return workflows and total count when filtering by userId', async () => {
      const result = await service.getWorkflowsAndTotal({}, user.id);
      expect(result).toEqual({
        workflows: [expectedWorkflow],
        total: 1,
      });
      expect(
        workflowRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."userId" = :userId', {
        userId: user.id,
      });
    });

    it('should return workflows and total count when filtering by status', async () => {
      const result = await service.getWorkflowsAndTotal({
        status: WorkflowStatus.RUNNING,
      });
      expect(result).toEqual({
        workflows: [expectedWorkflow],
        total: 1,
      });
      expect(
        workflowRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."status" = :status', {
        status: expectedWorkflow.status,
      });
    });

    it('should return workflows and total count when filtering by search', async () => {
      const result = await service.getWorkflowsAndTotal({
        search: 'test',
      });
      expect(result).toEqual({
        workflows: [expectedWorkflow],
        total: 1,
      });
      expect(
        workflowRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."name" ILIKE :search', {
        search: `%test%`,
      });
    });

    it('should return workflows and total count when filtering by limit and offset', async () => {
      const result = await service.getWorkflowsAndTotal({
        limit: 10,
        offset: 0,
      });
      expect(result).toEqual({
        workflows: [expectedWorkflow],
        total: 1,
      });
      expect(
        workflowRepository.createQueryBuilder().limit,
      ).toHaveBeenCalledWith(10);
      expect(
        workflowRepository.createQueryBuilder().offset,
      ).toHaveBeenCalledWith(0);
    });
  });

  describe('getWorkflowLogsAndTotal', () => {
    const workflowLog = mockWorkflowLogSummary(expectedWorkflow);

    afterEach(() => {
      jest.resetAllMocks();
    });

    beforeEach(() => {
      jest.spyOn(workflowLogRepository, 'createQueryBuilder').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([workflowLog]),
        getCount: jest.fn().mockResolvedValue(1),
      } as any);
    });

    it('should workflow logs and total count when no filter parameters are provided', async () => {
      const result = await service.getWorkflowLogsAndTotal({}, user.id);

      expect(result).toEqual({
        workflowLogs: [workflowLog],
        total: 1,
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."userId" = :userId', {
        userId: user.id,
      });

      expect(
        workflowLogRepository.createQueryBuilder().where,
      ).toHaveBeenCalledWith('wl.status IN (:...statuses) ', {
        statuses: [TaskStatus.FAILED, TaskStatus.SUCCESS],
      });
      expect(
        workflowLogRepository.createQueryBuilder().getCount,
      ).toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().addOrderBy,
      ).toHaveBeenCalledWith('wl."finishedAt"', 'DESC');

      // Has not been called yet
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('c."uuid" = :chainUuid', {
        chainUuid: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('wl."status" = :status', {
        status: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."name" ILIKE :search', {
        search: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."id" = :workflowId', {
        workflowId: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('wl."id" = :id', {
        id: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().limit,
      ).not.toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().offset,
      ).not.toHaveBeenCalled();
    });

    it('should workflow logs and total count when filtering by workflowId', async () => {
      const result = await service.getWorkflowLogsAndTotal(
        { workflowId: expectedWorkflow.id },
        user.id,
      );

      expect(result).toEqual({
        workflowLogs: [workflowLog],
        total: 1,
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."userId" = :userId', {
        userId: user.id,
      });
      expect(
        workflowLogRepository.createQueryBuilder().where,
      ).toHaveBeenCalledWith('wl.status IN (:...statuses) ', {
        statuses: [TaskStatus.FAILED, TaskStatus.SUCCESS],
      });
      expect(
        workflowLogRepository.createQueryBuilder().getCount,
      ).toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().addOrderBy,
      ).toHaveBeenCalledWith('wl."finishedAt"', 'DESC');
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."id" = :workflowId', {
        workflowId: expectedWorkflow.id,
      });

      // Has not been called yet
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('c."uuid" = :chainUuid', {
        chainUuid: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('wl."status" = :status', {
        status: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."name" ILIKE :search', {
        search: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('wl."id" = :id', {
        id: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().limit,
      ).not.toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().offset,
      ).not.toHaveBeenCalled();
    });

    it('should return workflow logs and total count when filtering by chainUuid', async () => {
      const result = await service.getWorkflowLogsAndTotal(
        { chainUuid: expectedWorkflow.chain.uuid },
        user.id,
      );

      expect(result).toEqual({
        workflowLogs: [workflowLog],
        total: 1,
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."userId" = :userId', {
        userId: user.id,
      });
      expect(
        workflowLogRepository.createQueryBuilder().where,
      ).toHaveBeenCalledWith('wl.status IN (:...statuses) ', {
        statuses: [TaskStatus.FAILED, TaskStatus.SUCCESS],
      });
      expect(
        workflowLogRepository.createQueryBuilder().getCount,
      ).toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().addOrderBy,
      ).toHaveBeenCalledWith('wl."finishedAt"', 'DESC');
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('c."uuid" = :chainUuid', {
        chainUuid: expectedWorkflow.chain.uuid,
      });

      // Has not been called yet
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('wl."status" = :status', {
        status: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."name" ILIKE :search', {
        search: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."id" = :workflowId', {
        workflowId: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('wl."id" = :id', {
        id: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().limit,
      ).not.toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().offset,
      ).not.toHaveBeenCalled();
    });

    it('should return workflow logs and total count when filtering by id', async () => {
      const result = await service.getWorkflowLogsAndTotal(
        { id: workflowLog.id },
        user.id,
      );

      expect(result).toEqual({
        workflowLogs: [workflowLog],
        total: 1,
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."userId" = :userId', {
        userId: user.id,
      });
      expect(
        workflowLogRepository.createQueryBuilder().where,
      ).toHaveBeenCalledWith('wl.status IN (:...statuses) ', {
        statuses: [TaskStatus.FAILED, TaskStatus.SUCCESS],
      });
      expect(
        workflowLogRepository.createQueryBuilder().getCount,
      ).toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().addOrderBy,
      ).toHaveBeenCalledWith('wl."finishedAt"', 'DESC');
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('wl."id" = :id', {
        id: workflowLog.id,
      });

      // Has not been called yet
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('c."uuid" = :chainUuid', {
        chainUuid: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('wl."status" = :status', {
        status: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."name" ILIKE :search', {
        search: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."id" = :workflowId', {
        workflowId: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().limit,
      ).not.toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().offset,
      ).not.toHaveBeenCalled();
    });

    it('should return workflow logs and total count when filtering by order FINISHED_AT', async () => {
      const result1 = await service.getWorkflowLogsAndTotal(
        { order: GetWorkflowLogsOrderBy.FINISHED_AT },
        user.id,
      );

      expect(result1).toEqual({
        workflowLogs: [workflowLog],
        total: 1,
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."userId" = :userId', {
        userId: user.id,
      });
      expect(
        workflowLogRepository.createQueryBuilder().where,
      ).toHaveBeenCalledWith('wl.status IN (:...statuses) ', {
        statuses: [TaskStatus.FAILED, TaskStatus.SUCCESS],
      });
      expect(
        workflowLogRepository.createQueryBuilder().getCount,
      ).toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().addOrderBy,
      ).toHaveBeenCalledWith('wl."finishedAt"', 'DESC');

      // Has not been called yet
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('c."uuid" = :chainUuid', {
        chainUuid: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('wl."status" = :status', {
        status: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."name" ILIKE :search', {
        search: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."id" = :workflowId', {
        workflowId: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('wl."id" = :id', {
        id: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().limit,
      ).not.toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().offset,
      ).not.toHaveBeenCalled();
    });

    it('should return workflow logs and total count when filtering by order NAME', async () => {
      const result1 = await service.getWorkflowLogsAndTotal(
        { order: GetWorkflowLogsOrderBy.NAME },
        user.id,
      );

      expect(result1).toEqual({
        workflowLogs: [workflowLog],
        total: 1,
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."userId" = :userId', {
        userId: user.id,
      });
      expect(
        workflowLogRepository.createQueryBuilder().where,
      ).toHaveBeenCalledWith('wl.status IN (:...statuses) ', {
        statuses: [TaskStatus.FAILED, TaskStatus.SUCCESS],
      });
      expect(
        workflowLogRepository.createQueryBuilder().getCount,
      ).toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().addOrderBy,
      ).toHaveBeenCalledWith('w."name"', 'DESC');

      // Has not been called yet
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('c."uuid" = :chainUuid', {
        chainUuid: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('wl."status" = :status', {
        status: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."name" ILIKE :search', {
        search: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."id" = :workflowId', {
        workflowId: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('wl."id" = :id', {
        id: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().limit,
      ).not.toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().offset,
      ).not.toHaveBeenCalled();
    });

    it('should return workflow logs and total count when filtering by order STARTED_AT', async () => {
      const result1 = await service.getWorkflowLogsAndTotal(
        { order: GetWorkflowLogsOrderBy.STARTED_AT },
        user.id,
      );

      expect(result1).toEqual({
        workflowLogs: [workflowLog],
        total: 1,
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."userId" = :userId', {
        userId: user.id,
      });
      expect(
        workflowLogRepository.createQueryBuilder().where,
      ).toHaveBeenCalledWith('wl.status IN (:...statuses) ', {
        statuses: [TaskStatus.FAILED, TaskStatus.SUCCESS],
      });
      expect(
        workflowLogRepository.createQueryBuilder().getCount,
      ).toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().addOrderBy,
      ).toHaveBeenCalledWith('wl."startedAt"', 'DESC');

      // Has not been called yet
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('c."uuid" = :chainUuid', {
        chainUuid: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('wl."status" = :status', {
        status: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."name" ILIKE :search', {
        search: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."id" = :workflowId', {
        workflowId: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('wl."id" = :id', {
        id: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().limit,
      ).not.toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().offset,
      ).not.toHaveBeenCalled();
    });

    it('should return workflow logs and total count when filtering by status', async () => {
      const result = await service.getWorkflowLogsAndTotal(
        { status: TaskStatus.SUCCESS },
        user.id,
      );

      expect(result).toEqual({
        workflowLogs: [workflowLog],
        total: 1,
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."userId" = :userId', {
        userId: user.id,
      });
      expect(
        workflowLogRepository.createQueryBuilder().where,
      ).toHaveBeenCalledWith('wl.status IN (:...statuses) ', {
        statuses: [TaskStatus.FAILED, TaskStatus.SUCCESS],
      });
      expect(
        workflowLogRepository.createQueryBuilder().getCount,
      ).toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().addOrderBy,
      ).toHaveBeenCalledWith('wl."finishedAt"', 'DESC');
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('wl."status" = :status', {
        status: 'success',
      });

      // Has not been called yet
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('c."uuid" = :chainUuid', {
        chainUuid: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."name" ILIKE :search', {
        search: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."id" = :workflowId', {
        workflowId: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('wl."id" = :id', {
        id: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().limit,
      ).not.toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().offset,
      ).not.toHaveBeenCalled();
    });

    it('should return workflow logs and total count when filtering by search', async () => {
      const result = await service.getWorkflowLogsAndTotal(
        { search: 'test' },
        user.id,
      );

      expect(result).toEqual({
        workflowLogs: [workflowLog],
        total: 1,
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."userId" = :userId', {
        userId: user.id,
      });
      expect(
        workflowLogRepository.createQueryBuilder().where,
      ).toHaveBeenCalledWith('wl.status IN (:...statuses) ', {
        statuses: [TaskStatus.FAILED, TaskStatus.SUCCESS],
      });
      expect(
        workflowLogRepository.createQueryBuilder().getCount,
      ).toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().addOrderBy,
      ).toHaveBeenCalledWith('wl."finishedAt"', 'DESC');
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."name" ILIKE :search', {
        search: '%test%',
      });

      // Has not been called yet
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('c."uuid" = :chainUuid', {
        chainUuid: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('wl."status" = :status', {
        status: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."id" = :workflowId', {
        workflowId: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('wl."id" = :id', {
        id: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().limit,
      ).not.toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().offset,
      ).not.toHaveBeenCalled();
    });

    it('should return workflow logs and total count when filtering by limit and offset', async () => {
      const result = await service.getWorkflowLogsAndTotal(
        { limit: 1, offset: 1 },
        user.id,
      );

      expect(result).toEqual({
        workflowLogs: [workflowLog],
        total: 1,
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('w."userId" = :userId', {
        userId: user.id,
      });
      expect(
        workflowLogRepository.createQueryBuilder().where,
      ).toHaveBeenCalledWith('wl.status IN (:...statuses) ', {
        statuses: [TaskStatus.FAILED, TaskStatus.SUCCESS],
      });
      expect(
        workflowLogRepository.createQueryBuilder().getCount,
      ).toHaveBeenCalled();
      expect(
        workflowLogRepository.createQueryBuilder().addOrderBy,
      ).toHaveBeenCalledWith('wl."finishedAt"', 'DESC');
      expect(
        workflowLogRepository.createQueryBuilder().limit,
      ).toHaveBeenCalledWith(1);
      expect(
        workflowLogRepository.createQueryBuilder().offset,
      ).toHaveBeenCalledWith(1);

      // Has not been called yet
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('c."uuid" = :chainUuid', {
        chainUuid: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('wl."status" = :status', {
        status: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."name" ILIKE :search', {
        search: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('w."id" = :workflowId', {
        workflowId: expect.anything(),
      });
      expect(
        workflowLogRepository.createQueryBuilder().andWhere,
      ).not.toHaveBeenCalledWith('wl."id" = :id', {
        id: expect.anything(),
      });
    });
  });

  describe('processWorkflow', () => {
    afterEach(() => {
      jest.resetAllMocks();
    });

    const event = mockEvent();
    const input: ProcessWorkflowInput = {
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        data: {
          from: 'foo',
          to: 'bar',
        },
        time: new Date(),
        block: {
          hash: 'hash',
        },
        success: true,
        timestamp: Date.now(),
      },
      workflow: {
        id: ulid(),
        name: ulid(),
      },
      chain: {
        uuid: ulid(),
        name: ulid(),
      },
      user: mockUserEntity(),
    };
    const triggerTask = mockTriggerTask(input.event.id, input.workflow.id);
    const filterTask = mockFilterTask(input.workflow.id, triggerTask.id);
    filterTask.config = {
      conditions: [
        [
          {
            value: 'foo',
            operator: 'equal',
            variable: 'event.data.from',
          },
        ],
      ],
    };
    const emailTask = mockEmailTask(input.workflow.id, filterTask.id);
    const schema = {
      start: new BaseTask(triggerTask),
      [triggerTask.id]: new BaseTask(filterTask),
      [filterTask.id]: new BaseTask(emailTask),
    };

    it('should return the output object if the first task process failed', async () => {
      const processTaskResult = {
        status: TaskStatus.FAILED,
        error: {
          message: 'error',
        },
        startedAt: new Date(),
        finishedAt: new Date(),
      };
      jest
        .spyOn(taskService, 'processTask')
        .mockResolvedValueOnce(processTaskResult);
      const rs = await service.processWorkflow(input, schema, {}, 'start');
      expect(rs).toEqual({
        [triggerTask.id]: processTaskResult,
      });
    });

    it('should return the output object if the middle task process failed', async () => {
      const processTaskFailedResult = {
        status: TaskStatus.FAILED,
        error: {
          message: 'error',
        },
        startedAt: new Date(),
        finishedAt: new Date(),
      };
      const processTaskSuccessResult = {
        status: TaskStatus.SUCCESS,
        output: {
          match: false,
        },
        startedAt: new Date(),
        finishedAt: new Date(),
      };

      jest.spyOn(taskService, 'processTask').mockImplementation((input) => {
        if (input.type === 'filter') {
          return Promise.resolve(processTaskFailedResult);
        }
        return Promise.resolve(processTaskSuccessResult);
      });
      const rs = await service.processWorkflow(input, schema, {}, 'start');
      expect(rs).toEqual({
        [triggerTask.id]: processTaskSuccessResult,
        [filterTask.id]: processTaskFailedResult,
      });
    });

    it('should return the output object if the condition not match', async () => {
      const processTaskSuccessResult = {
        status: TaskStatus.SUCCESS,
        output: {
          match: false,
        },
        startedAt: new Date(),
        finishedAt: new Date(),
      };

      jest
        .spyOn(taskService, 'processTask')
        .mockResolvedValue(processTaskSuccessResult);
      const rs = await service.processWorkflow(input, schema, {}, 'start');
      expect(rs).toEqual({
        [triggerTask.id]: processTaskSuccessResult,
        [filterTask.id]: processTaskSuccessResult,
      });
    });

    it('should return the output object if process all tasks succeed', async () => {
      const processTaskSuccessResult = {
        status: TaskStatus.SUCCESS,
        output: {
          match: true,
        },
        startedAt: new Date(),
        finishedAt: new Date(),
      };

      jest
        .spyOn(taskService, 'processTask')
        .mockResolvedValue(processTaskSuccessResult);
      const rs = await service.processWorkflow(input, schema, {}, 'start');
      expect(rs).toEqual({
        [triggerTask.id]: processTaskSuccessResult,
        [filterTask.id]: processTaskSuccessResult,
        [emailTask.id]: processTaskSuccessResult,
      });
    });
  });
});
