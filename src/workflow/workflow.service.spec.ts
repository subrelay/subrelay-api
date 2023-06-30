import { Repository } from 'typeorm';
import { WorkflowService } from './workflow.service';
import { WorkflowEntity } from './entity/workflow.entity';
import { WorkflowLogEntity } from './entity/workflow-log.entity';
import { TaskService } from '../task/task.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceName, getRepositoryToken } from '@nestjs/typeorm';
import { ulid } from 'ulid';
import { TaskStatus } from '../task/type/task.type';
import {
  mockChainEntity,
  mockChainSummary,
  mockEmailTask,
  mockEvent,
  mockEventEntity,
  mockFilterTask,
  mockTriggerTask,
  mockUserEntity,
  mockWebhookTask,
  mockWorkflowEntity,
} from '../../test/mock-data.util';
import { CreateWorkFlowRequest, WorkflowTaskInput } from './workflow.dto';
import { UserSummary } from '../user/user.dto';
import { isInstance } from 'class-validator';
import { TaskEntity } from '../task/entity/task.entity';
import { find } from 'lodash';
import * as CryptoUtil from '../common/crypto.util';
import { WorkflowStatus } from './workflow.type';
import { WebhookTaskConfig } from '../task/type/webhook.type';

jest.mock('../common/crypto.util');

describe('WorkflowService', () => {
  let service: WorkflowService;
  let workflowRepository: Repository<WorkflowEntity>;
  let workflowLogRepository: Repository<WorkflowLogEntity>;
  let taskService: TaskService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        {
          provide: TaskService,
          useValue: {
            createTask: jest.fn(),
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
    const tasks = [triggerTask, emailTask] as TaskEntity[];
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
  });
});
