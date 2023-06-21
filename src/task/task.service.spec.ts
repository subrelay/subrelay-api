import { Test, TestingModule } from '@nestjs/testing';
import { TelegramService } from '../telegram/telegram.service';
import { DiscordService } from '../discord/discord.service';
import {
  mockChainEntity,
  mockDiscordUser,
  mockEvent,
  mockEventEntity,
  mockFilterTask,
  mockTaskLogEntity,
  mockTelegramUser,
  mockTriggerTask,
  mockUserEntity,
  mockWebhookTask,
  mockWorkflowEntity,
} from '../../test/mock-data.util';
import { NotFoundException } from '@nestjs/common';
import { WebhookService } from '../webhook/webhook.service';
import { EmailService } from '../email/email.service';
import { TaskService } from './task.service';
import { EventService } from '../event/event.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from './entity/task.entity';
import { TaskLogEntity } from './entity/task-log.entity';
import { ProcessTaskInput, TaskLog, TaskStatus } from './type/task.type';
import { ulid } from 'ulid';
import { GeneralTypeEnum } from '../substrate/substrate.type';
import { DataField } from '../event/event.dto';
import { FilterTaskConfig, FilterVariableOperator } from './type/filter.type';

describe('TaskService', () => {
  let service: TaskService;
  let telegramService: TelegramService;
  let discordService: DiscordService;
  let webhookService: WebhookService;
  let emailService: EmailService;
  let eventService: EventService;
  let taskRepository: Repository<TaskEntity>;
  let taskLogRepository: Repository<TaskLogEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskService],
      providers: [
        {
          provide: TelegramService,
          useValue: {
            getUser: jest.fn(),
          },
        },
        {
          provide: WebhookService,
          useValue: {
            generateSignatureHeader: jest.fn(),
            sendMessage: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: {
            getUser: jest.fn(),
          },
        },
        {
          provide: DiscordService,
          useValue: {
            getUser: jest.fn(),
          },
        },
        {
          provide: EventService,
          useValue: {
            getEventDataFields: jest.fn(),
            getEventStatusFields: jest.fn(),
            getEventInfoFields: jest.fn(),
            getEventExtraFields: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TaskEntity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(TaskLogEntity),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    telegramService = module.get<TelegramService>(TelegramService);
    discordService = module.get<DiscordService>(DiscordService);
    webhookService = module.get<WebhookService>(WebhookService);
    emailService = module.get<EmailService>(EmailService);
    eventService = module.get<EventService>(EventService);
    taskRepository = module.get<Repository<TaskEntity>>(
      getRepositoryToken(TaskEntity),
    );
    taskLogRepository = module.get<Repository<TaskLogEntity>>(
      getRepositoryToken(TaskLogEntity),
    );
  });

  describe('createTaskLogs', () => {
    it('should save the input to the task log repository', async () => {
      const task = mockFilterTask('test', 'anotherTask');
      const input = [
        {
          id: ulid(),
          status: TaskStatus.SUCCESS,
          taskId: task.id,
          workflowLogId: 'workflowLogId',
          output: undefined,
          input: undefined,
          error: undefined,
          startedAt: new Date(),
          finishedAt: new Date(),
        },
      ];
      jest.spyOn(taskLogRepository, 'save').mockResolvedValueOnce(undefined);

      await service.createTaskLogs(input);
      expect(taskLogRepository.save).toHaveBeenCalledWith(input);
    });
  });

  describe('updateTaskLogStatus', () => {
    it('should update the task log repository with the new status and startedAt time', async () => {
      const id = '123';
      const status = TaskStatus.FAILED;
      const startedAt = new Date();
      jest.spyOn(taskLogRepository, 'update').mockResolvedValueOnce(undefined);

      await service.updateTaskLogStatus(id, status);

      expect(taskLogRepository.update).toHaveBeenCalledWith(
        { id },
        { status, startedAt },
      );
    });
  });

  describe('finishTaskLog', () => {
    it('should update the task log repository with the new status, output, and finishedAt time', async () => {
      const id = '123';
      const status = TaskStatus.SUCCESS;
      const output = { message: 'Task completed successfully' };
      const finishedAt = new Date();
      jest.spyOn(taskLogRepository, 'update').mockResolvedValueOnce(undefined);

      await service.finishTaskLog(id, { status, output });

      expect(taskLogRepository.update).toHaveBeenCalledWith(
        { id },
        { status, output, finishedAt },
      );
    });
  });

  describe('skipPendingTaskLogs', () => {
    it('should update the task log repository with the new status and finishedAt time for all pending task logs with the given workflowLogId', async () => {
      const workflowLogId = '123';
      jest.spyOn(taskLogRepository, 'update').mockResolvedValueOnce(undefined);

      await service.skipPendingTaskLogs(workflowLogId);

      expect(taskLogRepository.update).toHaveBeenCalledWith(
        { workflowLogId, status: TaskStatus.PENDING },
        { status: TaskStatus.SKIPPED, finishedAt: expect.any(Date) },
      );
    });
  });

  describe('getTasks', () => {
    it('should return tasks in the correct order', async () => {
      const chain = mockChainEntity();
      const event = mockEventEntity(chain.uuid);
      const workflow = mockWorkflowEntity(mockUserEntity(), event, chain);

      jest.spyOn(taskRepository, 'find').mockResolvedValue(workflow.tasks);

      const actualTasks = await service.getTasks(workflow.id, false);

      expect(actualTasks).toEqual(workflow.tasks);
    });

    it('should protect the webhook config when protect is true', async () => {
      const task = mockWebhookTask('workflow-id', 'test');
      task.config = {
        ...task.config,
        secret: 'secret',
      };
      const tasks = [task];
      jest.spyOn(taskRepository, 'find').mockResolvedValue(tasks);

      const actualTasks = await service.getTasks('workflow-id', true);
      expect(actualTasks[0].config.secret).toBeNull();
    });
  });

  describe('getFilterTasks', () => {
    it('should return an array of filter tasks', async () => {
      const workflowVersionIds = [1, 2, 3];
      const eventIds = [4, 5, 6];
      const tasks = [mockFilterTask('1', '2'), mockFilterTask('3', '4')];

      jest.spyOn(taskRepository, 'createQueryBuilder').mockReturnValueOnce({
        where: jest.fn().mockReturnThis(),
        andWhereInIds: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValueOnce(tasks),
      } as any);

      const result = await service.getFilterTasks(workflowVersionIds, eventIds);

      expect(result).toEqual(tasks);
    });
  });

  describe('getOperatorMapping', () => {
    it('returns a mapping of operators for boolean, string, and number types', () => {
      const operatorMapping = service.getOperatorMapping();

      expect(operatorMapping).toEqual({
        boolean: ['isFalse', 'isTrue'],
        string: ['equal', 'contains'],
        number: [
          'equal',
          'greaterThan',
          'greaterThanEqual',
          'lessThan',
          'lessThanEqual',
        ],
      });
    });
  });

  describe('getFilterFields', () => {
    it('should return an array of data fields with updated names and descriptions', () => {
      const event = mockEvent();
      const field: DataField = {
        name: 'description',
        type: GeneralTypeEnum.STRING,
        data: {},
        description: 'description',
        display: 'description',
        originalType: 'string',
      };
      const statusField = {
        name: 'success',
        description: 'The status of the event',
        type: GeneralTypeEnum.BOOL,
        data: true,
        display: 'Status',
      };
      jest
        .spyOn(eventService, 'getEventDataFields')
        .mockReturnValueOnce([field]);
      jest
        .spyOn(eventService, 'getEventStatusFields')
        .mockReturnValueOnce([statusField]);
      const result = service.getFilterFields(event);

      expect(result).toEqual([
        {
          ...field,
          name: 'event.description',
          description: 'Description',
        },
        {
          ...statusField,
          name: 'event.success',
          description: 'The status of the event',
        },
      ]);
    });
  });

  describe('getCustomMessageFields', () => {
    it('should return an array of data fields with updated names', () => {
      const event = mockEvent();
      const field: DataField = {
        name: 'description',
        type: GeneralTypeEnum.STRING,
        data: {},
        description: 'description',
        display: 'description',
        originalType: 'string',
      };
      const statusField = {
        name: 'success',
        description: 'The status of the event',
        type: GeneralTypeEnum.BOOL,
        data: true,
        display: 'Status',
      };
      const extraField = {
        name: 'block.hash',
        description: 'The hash of the block',
        type: GeneralTypeEnum.STRING,
        data: '123',
        display: 'Block Hash',
      };
      const infoField = {
        name: 'id',
        description: 'The Id of the event',
        type: GeneralTypeEnum.NUMBER,
        data: event.id,
        display: 'Event ID',
      };

      jest
        .spyOn(eventService, 'getEventDataFields')
        .mockReturnValueOnce([field]);
      jest
        .spyOn(eventService, 'getEventStatusFields')
        .mockReturnValueOnce([statusField]);
      jest
        .spyOn(eventService, 'getEventInfoFields')
        .mockReturnValueOnce([infoField]);
      jest
        .spyOn(eventService, 'getEventExtraFields')
        .mockReturnValueOnce([extraField]);

      const result = service.getCustomMessageFields(event);

      expect(result).toEqual([
        {
          name: 'workflow.id',
          description: 'The workflow ID',
          type: GeneralTypeEnum.STRING,
          data: expect.any(String),
          display: 'Workflow ID',
        },
        {
          name: 'workflow.name',
          description: 'The workflow name',
          type: GeneralTypeEnum.STRING,
          data: `Workflow for event ${event.name}`,
          display: 'Workflow Name',
        },
        {
          name: 'chain.name',
          description: 'The chain name',
          type: GeneralTypeEnum.STRING,
          data: event.chain.name,
          display: 'Chain Name',
        },
        {
          ...field,
          name: 'event.description',
        },
        {
          ...statusField,
          name: 'event.success',
        },
        {
          ...infoField,
          name: 'event.id',
        },
        {
          ...extraField,
          name: 'event.block.hash',
        },
      ]);
    });
  });

  describe('processFilterTask', () => {
    const defaultInput = {
      event: {
        id: '123',
        name: 'test',
        description: 'test',
        block: {
          hash: '123',
        },
        data: {
          value: 9,
        },
        success: true,
        timestamp: Date.now(),
        time: new Date(),
      },
    };

    it('should return success with match=true if no conditions are given', () => {
      const config: FilterTaskConfig = {
        conditions: [],
      };

      const result = service.processFilterTask(config, defaultInput);

      expect(result.status).toBe(TaskStatus.SUCCESS);
      expect(result.output.match).toBe(true);
    });

    it('should return success with match=false if no conditions match', () => {
      // Arrange
      const config: FilterTaskConfig = {
        conditions: [
          [
            {
              variable: 'value',
              operator: FilterVariableOperator.EQUAL,
              value: 1,
            },
          ],
        ],
      };

      const result = service.processFilterTask(config, defaultInput);

      expect(result.status).toBe(TaskStatus.SUCCESS);
      expect(result.output.match).toBe(false);
    });

    it('should return success with match=true if one condition matches', () => {
      const config: FilterTaskConfig = {
        conditions: [
          [
            {
              variable: 'event.data.value',
              operator: FilterVariableOperator.EQUAL,
              value: 1,
            },
          ],
        ],
      };
      const input = {
        ...defaultInput,
      };
      input.event.data.value = 1;

      const result = service.processFilterTask(config, input);

      expect(result.status).toBe(TaskStatus.SUCCESS);
      expect(result.output.match).toBe(true);
    });

    it('should return success with match=true if all conditions match', () => {
      const config: FilterTaskConfig = {
        conditions: [
          [
            {
              variable: 'event.data.value',
              operator: FilterVariableOperator.GREATER_THAN,
              value: 1,
            },
            {
              variable: 'event.data.value',
              operator: FilterVariableOperator.LESS_THAN,
              value: 3,
            },
          ],
        ],
      };
      const input = {
        ...defaultInput,
      };
      input.event.data.value = 2;
      const result = service.processFilterTask(config, input);

      expect(result.status).toBe(TaskStatus.SUCCESS);
      expect(result.output.match).toBe(true);
    });

    it('should return success with match=true if one of conditions match', () => {
      const config: FilterTaskConfig = {
        conditions: [
          [
            {
              variable: 'event.data.value',
              operator: FilterVariableOperator.GREATER_THAN,
              value: 10,
            },
          ],
          [
            {
              variable: 'event.data.value',
              operator: FilterVariableOperator.LESS_THAN,
              value: 5,
            },
          ],
        ],
      };
      const input = {
        ...defaultInput,
      };
      input.event.data.value = 2;
      const result = service.processFilterTask(config, input);

      expect(result.status).toBe(TaskStatus.SUCCESS);
      expect(result.output.match).toBe(true);
    });

    it('should return failed status with error message if an exception is thrown', () => {
      const result = service.processFilterTask(
        {} as any as FilterTaskConfig,
        {} as any as ProcessTaskInput,
      );

      expect(result.status).toBe(TaskStatus.FAILED);
      expect(result.error.message).toBeDefined();
    });
  });

  describe('getTaskLogs', () => {
    it('should return an array of TaskLogEntity objects', async () => {
      const workflowLogId = 'some-workflow-log-id';
      const task = mockFilterTask('workflow-id', 'some-task-id');
      const taskLog = mockTaskLogEntity(task);

      jest.spyOn(taskLogRepository, 'find').mockResolvedValueOnce([taskLog]);
      const taskLogs = await service.getTaskLogs(workflowLogId);

      expect(taskLogs).toEqual([taskLog]);
    });
  });

  describe('processWebhookTask', () => {
    const signatureHeader = 'my-signature';
    const errorMessage = 'Failed to process webhook task.';
    const workflow = mockWorkflowEntity();

    const defaultConfig = {
      url: 'https://example.com/webhook',
      secret: 'my-secret',
      encrypted: false,
    };
    const defaultInput: ProcessTaskInput = {
      event: {
        id: '123',
        name: 'test',
        description: 'test',
        block: {
          hash: '123',
        },
        data: {
          value: 9,
        },
        success: true,
        timestamp: Date.now(),
        time: new Date(),
      },
      workflow,
      chain: workflow.chain,
      user: workflow.user,
    };
    const message = {
      event: defaultInput.event,
      workflow: defaultInput.workflow,
      chain: defaultInput.chain,
    };

    it('should send message with correct parameters on success', async () => {
      jest
        .spyOn(webhookService, 'generateSignatureHeader')
        .mockReturnValue(signatureHeader);

      const result = await service.processWebhookTask(
        defaultConfig,
        defaultInput,
      );

      expect(result).toEqual({
        input: message,
        status: TaskStatus.SUCCESS,
      });

      expect(webhookService.generateSignatureHeader).toHaveBeenCalledWith(
        defaultConfig.secret,
        defaultConfig.encrypted,
        message,
      );
      expect(webhookService.sendMessage).toHaveBeenCalledWith(
        defaultConfig.url,
        message,
        signatureHeader,
      );
    });

    it('should return failed result on signature generation error', async () => {
      jest
        .spyOn(webhookService, 'generateSignatureHeader')
        .mockImplementationOnce(() => {
          throw new Error(errorMessage);
        });

      const result = await service.processWebhookTask(
        defaultConfig,
        defaultInput,
      );

      expect(result).toEqual({
        input: message,
        status: TaskStatus.FAILED,
        error: { message: errorMessage },
      });
      expect(webhookService.generateSignatureHeader).toHaveBeenCalledWith(
        defaultConfig.secret,
        defaultConfig.encrypted,
        message,
      );
      expect(webhookService.sendMessage).not.toHaveBeenCalled();
    });

    it('should return failed result on message sending error with status code', async () => {
      const error = {
        response: { status: 400 },
      };
      jest
        .spyOn(webhookService, 'generateSignatureHeader')
        .mockReturnValueOnce(signatureHeader);

      jest.spyOn(webhookService, 'sendMessage').mockRejectedValue(error);

      const result = await service.processWebhookTask(
        defaultConfig,
        defaultInput,
      );

      expect(result).toEqual({
        input: message,
        status: TaskStatus.FAILED,
        error: {
          message: `Sending request to webhook URL failed with status code ${error.response.status}.`,
        },
      });
      expect(webhookService.generateSignatureHeader).toHaveBeenCalledWith(
        defaultConfig.secret,
        defaultConfig.encrypted,
        message,
      );
      expect(webhookService.sendMessage).toHaveBeenCalledWith(
        defaultConfig.url,
        message,
        signatureHeader,
      );
    });

    it('should return failed result on message sending error with 404 status code', async () => {
      const error = {
        response: { status: 404 },
      };
      jest
        .spyOn(webhookService, 'generateSignatureHeader')
        .mockReturnValueOnce(signatureHeader);

      jest.spyOn(webhookService, 'sendMessage').mockRejectedValue(error);

      const result = await service.processWebhookTask(
        defaultConfig,
        defaultInput,
      );

      expect(result).toEqual({
        input: message,
        status: TaskStatus.FAILED,
        error: {
          message: `Webhook URL does not exist.`,
        },
      });
      expect(webhookService.generateSignatureHeader).toHaveBeenCalledWith(
        defaultConfig.secret,
        defaultConfig.encrypted,
        message,
      );
      expect(webhookService.sendMessage).toHaveBeenCalledWith(
        defaultConfig.url,
        message,
        signatureHeader,
      );
    });

    describe('buildCustomMessage', () => {
      const workflow = mockWorkflowEntity();
      const defaultInput: ProcessTaskInput = {
        event: {
          id: '123',
          name: 'test',
          description: 'test',
          block: {
            hash: '123',
          },
          data: { taskName: 'myTask', status: 'completed' },
          success: true,
          timestamp: Date.now(),
          time: new Date(),
        },
        workflow,
        chain: workflow.chain,
        user: workflow.user,
      };

      it('returns the compiled message', () => {
        const messageTemplate =
          'Event ${ event.name } has ${ event.data.status }';
        const expectedMessage = 'Event test has completed';

        expect(
          service.buildCustomMessage(messageTemplate, defaultInput),
        ).toEqual(expectedMessage);
      });
    });
  });
});
