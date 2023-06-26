import { Test, TestingModule } from '@nestjs/testing';
import { TelegramService } from '../telegram/telegram.service';
import { DiscordService } from '../discord/discord.service';
import {
  mockChainEntity,
  mockDiscordTask,
  mockDiscordUser,
  mockEmailTask,
  mockEvent,
  mockEventEntity,
  mockFilterTask,
  mockTaskLogEntity,
  mockTelegramTask,
  mockTelegramUser,
  mockTriggerTask,
  mockUserEntity,
  mockWebhookTask,
  mockWorkflowEntity,
} from '../../test/mock-data.util';
import { EmailTaskConfig, EmailTaskInput } from './type/email.type';
import { NotFoundException } from '@nestjs/common';
import { WebhookService } from '../webhook/webhook.service';
import { EmailService } from '../email/email.service';
import { TaskService } from './task.service';
import { EventService } from '../event/event.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskEntity } from './entity/task.entity';
import { TaskLogEntity } from './entity/task-log.entity';
import {
  BaseTask,
  ProcessTaskInput,
  TaskLog,
  TaskStatus,
  TaskType,
} from './type/task.type';
import { ulid } from 'ulid';
import { GeneralTypeEnum } from '../substrate/substrate.type';
import { DataField } from '../event/event.dto';
import { FilterTaskConfig, FilterVariableOperator } from './type/filter.type';
import { UserEntity } from '../user/user.entity';
import { WebhookTaskConfig } from './type/webhook.type';
import { TelegramTaskConfig } from './type/telegram.type';
import { DiscordTaskConfig } from './type/discord.type';

describe('TaskService', () => {
  let service: TaskService;
  let telegramService: TelegramService;
  let discordService: DiscordService;
  let webhookService: WebhookService;
  let emailService: EmailService;
  let eventService: EventService;
  let taskRepository: Repository<TaskEntity>;
  let taskLogRepository: Repository<TaskLogEntity>;
  let userRepository: Repository<UserEntity>;

  const workflow = mockWorkflowEntity();
  const mockUser = mockUserEntity();
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TaskService],
      providers: [
        {
          provide: getRepositoryToken(UserEntity),
          useClass: Repository,
        },

        {
          provide: TelegramService,
          useValue: {
            getUser: jest.fn(),
            sendDirectMessage: jest.fn(),
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
            sendEmails: jest.fn(),
          },
        },
        {
          provide: DiscordService,
          useValue: {
            getUser: jest.fn(),
            sendDirectMessage: jest.fn(),
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
    userRepository = module.get<Repository<UserEntity>>(
      getRepositoryToken(UserEntity),
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
  });

  describe('buildCustomMessage', () => {
    it('returns the compiled message', () => {
      const messageTemplate = 'Event ${ event.name } has been triggered';
      const expectedMessage = 'Event test has been triggered';

      expect(service.buildCustomMessage(messageTemplate, defaultInput)).toEqual(
        expectedMessage,
      );
    });
  });

  describe('getEmailTaskInput', () => {
    const mockEmailTaskConfig: EmailTaskConfig = {
      addresses: ['test@example.com'],
      subjectTemplate: 'Your event has been triggered',
      bodyTemplate: 'Event ${ event.name } has been triggered',
    };

    it('returns the expected email task input', () => {
      const actualEmailTaskInput = service.getEmailTaskInput(
        mockEmailTaskConfig,
        defaultInput,
      );

      expect(actualEmailTaskInput).toEqual({
        subject: mockEmailTaskConfig.subjectTemplate,
        body: 'Event test has been triggered',
      });
    });
  });

  describe('processEmailTask', () => {
    const mockEmailTaskConfig: EmailTaskConfig = {
      addresses: ['test@example.com'],
      subjectTemplate: 'Your event has been triggered',
      bodyTemplate: 'Event ${ event.name } has been triggered',
    };

    it('should send an email and return a success status', async () => {
      const input = {
        subject: 'test',
        body: 'test',
      };
      jest.spyOn(service, 'getEmailTaskInput').mockReturnValueOnce(input);
      jest.spyOn(emailService, 'sendEmails').mockResolvedValue(undefined);

      const result = await service.processEmailTask(
        mockEmailTaskConfig,
        defaultInput,
      );

      expect(emailService.sendEmails).toHaveBeenCalledWith(
        mockEmailTaskConfig.addresses,
        input.subject,
        input.body,
      );
      expect(result).toEqual({
        input,
        status: TaskStatus.SUCCESS,
      });
    });

    it('should log an error and return a failed status if sending emails fails', async () => {
      const error = new Error('Failed to send email');
      const input = {
        subject: 'test',
        body: 'test',
      };
      jest.spyOn(service, 'getEmailTaskInput').mockReturnValueOnce(input);
      jest.spyOn(emailService, 'sendEmails').mockRejectedValue(error);

      const result = await service.processEmailTask(
        mockEmailTaskConfig,
        defaultInput,
      );

      expect(emailService.sendEmails).toHaveBeenCalledWith(
        mockEmailTaskConfig.addresses,
        input.subject,
        input.body,
      );

      expect(result).toEqual({
        input,
        status: TaskStatus.FAILED,
        error: {
          message: error.message || 'Failed to process email task.',
        },
      });
    });
  });

  describe('getTelegramTaskInput', () => {
    it('returns a TelegramTaskInput object with the expected message', () => {
      const messageTemplate = 'Event ${ event.name } has been triggered';
      const result = service.getTelegramTaskInput(
        { messageTemplate },
        defaultInput,
      );

      expect(result).toEqual({ message: 'Event test has been triggered' });
    });
  });

  describe('getDiscordTaskInput', () => {
    it('returns a getDiscordTaskInput object with the expected message', () => {
      const messageTemplate = 'Event ${ event.name } has been triggered';
      const result = service.getDiscordTaskInput(
        { messageTemplate },
        defaultInput,
      );

      expect(result).toEqual({ message: 'Event test has been triggered' });
    });
  });

  describe('processTelegramTask', () => {
    const messageTemplate = 'Event ${ event.name } has been triggered';
    const expectedMessage = 'Event test has been triggered';

    it('should return FAILED status if chatId is not provided', async () => {
      const user = {
        ...mockUser,
        integration: {},
      };
      const input = {
        ...defaultInput,
        user,
      };
      const result = await service.processTelegramTask(
        { messageTemplate },
        input,
      );

      expect(result.status).toBe(TaskStatus.FAILED);
      expect(result.error?.message).toBe(
        "Telegram integration does't set up yet.",
      );
      expect(telegramService.sendDirectMessage).not.toHaveBeenCalled();
    });

    it('should send a direct message and return SUCCESS status if chatId is provided', async () => {
      const user = {
        ...mockUser,
        integration: {
          telegram: mockTelegramUser(),
        },
      };
      const input = {
        ...defaultInput,
        user,
      };

      const result = await service.processTelegramTask(
        { messageTemplate },
        input,
      );

      expect(result.status).toBe(TaskStatus.SUCCESS);
      expect(result.error).toBeUndefined();
      expect(telegramService.sendDirectMessage).toHaveBeenCalledWith(
        user.integration.telegram.id,
        expectedMessage,
      );
    });

    it('should return FAILED status with error message if sending direct message fails', async () => {
      const user = {
        ...mockUser,
        integration: {
          telegram: mockTelegramUser(),
        },
      };
      const input = {
        ...defaultInput,
        user,
      };
      const error = new Error('Failed to send message');
      jest
        .spyOn(telegramService, 'sendDirectMessage')
        .mockRejectedValueOnce(error);

      const result = await service.processTelegramTask(
        { messageTemplate },
        input,
      );

      expect(result.status).toBe(TaskStatus.FAILED);
      expect(result.error?.message).toBe('Failed to send message');
      expect(telegramService.sendDirectMessage).toHaveBeenCalledWith(
        user.integration.telegram.id,
        expectedMessage,
      );
    });
  });

  describe('processDiscordTask', () => {
    const messageTemplate = 'Event ${ event.name } has been triggered';
    const expectedMessage = 'Event test has been triggered';

    it('should return FAILED status if chatId is not provided', async () => {
      const user = {
        ...mockUser,
        integration: {},
      };
      const input = {
        ...defaultInput,
        user,
      };
      const result = await service.processDiscordTask(
        { messageTemplate },
        input,
      );

      expect(result.status).toBe(TaskStatus.FAILED);
      expect(result.error?.message).toBe(
        "Discord integration does't set up yet.",
      );
      expect(discordService.sendDirectMessage).not.toHaveBeenCalled();
    });

    it('should send a direct message and return SUCCESS status if chatId is provided', async () => {
      const user = {
        ...mockUser,
        integration: {
          discord: mockDiscordUser(),
        },
      };
      const input = {
        ...defaultInput,
        user,
      };

      const result = await service.processDiscordTask(
        { messageTemplate },
        input,
      );

      expect(result.status).toBe(TaskStatus.SUCCESS);
      expect(result.error).toBeUndefined();
      expect(discordService.sendDirectMessage).toHaveBeenCalledWith(
        user.integration.discord.id,
        expectedMessage,
      );
    });

    it('should return FAILED status with error message if sending direct message fails', async () => {
      const user = {
        ...mockUser,
        integration: {
          discord: mockDiscordUser(),
        },
      };
      const input = {
        ...defaultInput,
        user,
      };
      const error = new Error('Failed to send message');
      jest
        .spyOn(discordService, 'sendDirectMessage')
        .mockRejectedValueOnce(error);

      const result = await service.processDiscordTask(
        { messageTemplate },
        input,
      );

      expect(result.status).toBe(TaskStatus.FAILED);
      expect(result.error?.message).toBe('Failed to send message');
      expect(discordService.sendDirectMessage).toHaveBeenCalledWith(
        user.integration.discord.id,
        expectedMessage,
      );
    });

    it('should return FAILED status with User not found error', async () => {
      const user = {
        ...mockUser,
        integration: {
          discord: mockDiscordUser(),
        },
      };
      const input = {
        ...defaultInput,
        user,
      };
      const error = new Error('Invalid Recipient(s)');
      jest
        .spyOn(discordService, 'sendDirectMessage')
        .mockRejectedValueOnce(error);

      const result = await service.processDiscordTask(
        { messageTemplate },
        input,
      );

      expect(result.status).toBe(TaskStatus.FAILED);
      expect(result.error?.message).toBe('User not found');
      expect(discordService.sendDirectMessage).toHaveBeenCalledWith(
        user.integration.discord.id,
        expectedMessage,
      );
    });
  });

  describe('isMatchCondition', () => {
    it('should return true for IS_TRUE operator if actualValue is true', () => {
      expect(
        service.isMatchCondition(FilterVariableOperator.IS_TRUE, true, null),
      ).toBe(true);
    });

    it('should return false for IS_TRUE operator if actualValue is false', () => {
      expect(
        service.isMatchCondition(FilterVariableOperator.IS_TRUE, false, null),
      ).toBe(false);
    });

    it('should return true for IS_FALSE operator if actualValue is false', () => {
      expect(
        service.isMatchCondition(FilterVariableOperator.IS_FALSE, false, null),
      ).toBe(true);
    });

    it('should return false for IS_FALSE operator if actualValue is true', () => {
      expect(
        service.isMatchCondition(FilterVariableOperator.IS_FALSE, true, null),
      ).toBe(false);
    });

    it('should return true for CONTAINS operator if actualValue is a string that includes expectedValue', () => {
      expect(
        service.isMatchCondition(
          FilterVariableOperator.CONTAINS,
          'hello world',
          'hello',
        ),
      ).toBe(true);
    });

    it('should return false for CONTAINS operator if actualValue is a string that does not include expectedValue', () => {
      expect(
        service.isMatchCondition(
          FilterVariableOperator.CONTAINS,
          'hello world',
          'goodbye',
        ),
      ).toBe(false);
    });

    it('should return true for GREATER_THAN operator if actualValue is greater than expectedValue', () => {
      expect(
        service.isMatchCondition(FilterVariableOperator.GREATER_THAN, 5, 3),
      ).toBe(true);
    });

    it('should return false for GREATER_THAN operator if actualValue is less than or equal to expectedValue', () => {
      expect(
        service.isMatchCondition(FilterVariableOperator.GREATER_THAN, 3, 5),
      ).toBe(false);
      expect(
        service.isMatchCondition(FilterVariableOperator.GREATER_THAN, 5, 5),
      ).toBe(false);
    });

    it('should return true for GREATER_THAN_EQUAL operator if actualValue is greater than or equal to expectedValue', () => {
      expect(
        service.isMatchCondition(
          FilterVariableOperator.GREATER_THAN_EQUAL,
          5,
          3,
        ),
      ).toBe(true);
      expect(
        service.isMatchCondition(
          FilterVariableOperator.GREATER_THAN_EQUAL,
          5,
          5,
        ),
      ).toBe(true);
    });

    it('should return false for GREATER_THAN_EQUAL operator if actualValue is less than expectedValue', () => {
      expect(
        service.isMatchCondition(
          FilterVariableOperator.GREATER_THAN_EQUAL,
          3,
          5,
        ),
      ).toBe(false);
    });

    it('should return true for LESS_THAN operator if actualValue is less than expectedValue', () => {
      expect(
        service.isMatchCondition(FilterVariableOperator.LESS_THAN, 3, 5),
      ).toBe(true);
    });

    it('should return false for LESS_THAN operator if actualValue is greater than or equal to expectedValue', () => {
      expect(
        service.isMatchCondition(FilterVariableOperator.LESS_THAN, 5, 3),
      ).toBe(false);
      expect(
        service.isMatchCondition(FilterVariableOperator.LESS_THAN, 5, 5),
      ).toBe(false);
    });

    it('should return true for LESS_THAN_EQUAL operator if actualValue is less than or equal to expectedValue', () => {
      expect(
        service.isMatchCondition(FilterVariableOperator.LESS_THAN_EQUAL, 3, 5),
      ).toBe(true);
      expect(
        service.isMatchCondition(FilterVariableOperator.LESS_THAN_EQUAL, 5, 5),
      ).toBe(true);
    });

    it('should return false for LESS_THAN_EQUAL operator if actualValue is greater than expectedValue', () => {
      expect(
        service.isMatchCondition(FilterVariableOperator.LESS_THAN_EQUAL, 5, 3),
      ).toBe(false);
    });

    it('should return true for EQUAL operator if actualValue is equal to expectedValue', () => {
      expect(service.isMatchCondition(FilterVariableOperator.EQUAL, 5, 5)).toBe(
        true,
      );
    });
  });

  describe('processTask', () => {
    it('should return success for trigger task', async () => {
      const task = new BaseTask(mockTriggerTask('eventId', 'wfId'));
      const result = await service.processTask(task, defaultInput);

      expect(result.status).toEqual(TaskStatus.SUCCESS);
    });

    it('should return result for filter task', async () => {
      const task = new BaseTask(mockFilterTask('wfId', ''));
      jest.spyOn(service, 'processFilterTask').mockReturnValueOnce({
        status: TaskStatus.SUCCESS,
        output: { match: true },
      });

      const result = await service.processTask(task, defaultInput);

      expect(result.status).toBe(TaskStatus.SUCCESS);
      expect(service.processFilterTask).toHaveBeenCalledWith(
        expect.any(FilterTaskConfig),
        defaultInput,
      );
    });

    it('should return error for filter task', async () => {
      const task = new BaseTask(mockFilterTask('wfId', ''));
      jest.spyOn(service, 'processFilterTask').mockReturnValueOnce({
        status: TaskStatus.FAILED,
        error: {
          message: 'Failed to process task',
        },
      });

      const result = await service.processTask(task, defaultInput);

      expect(result.status).toEqual(TaskStatus.FAILED);
      expect(result.error.message).toEqual('Failed to process task');
      expect(service.processFilterTask).toHaveBeenCalledWith(
        expect.any(FilterTaskConfig),
        defaultInput,
      );
    });

    it('should return result for email task', async () => {
      const task = new BaseTask(mockEmailTask('wfId', ''));
      jest.spyOn(service, 'processEmailTask').mockResolvedValueOnce({
        status: TaskStatus.SUCCESS,
        input: {
          body: 'Event test has been triggered',
          subject: 'Your event has been triggered',
        },
      });

      const result = await service.processTask(task, defaultInput);

      expect(result.status).toBe(TaskStatus.SUCCESS);
      expect(service.processEmailTask).toHaveBeenCalledWith(
        expect.any(EmailTaskConfig),
        defaultInput,
      );
    });

    it('should return error for email task', async () => {
      const task = new BaseTask(mockEmailTask('wfId', ''));
      const taskLog = {
        status: TaskStatus.FAILED,
        input: {
          body: 'Event test has been triggered',
          subject: 'Your event has been triggered',
        },
        error: {
          message: 'Failed to process task',
        },
      };
      jest.spyOn(service, 'processEmailTask').mockResolvedValueOnce(taskLog);

      const result = await service.processTask(task, defaultInput);

      expect(result.status).toBe(TaskStatus.FAILED);
      expect(result.input).toBe(taskLog.input);
      expect(result.error).toBe(taskLog.error);
      expect(service.processEmailTask).toHaveBeenCalledWith(
        expect.any(EmailTaskConfig),
        defaultInput,
      );
    });

    it('should return result for webhook task', async () => {
      const task = new BaseTask(mockWebhookTask('wfId', ''));
      jest.spyOn(service, 'processWebhookTask').mockResolvedValueOnce({
        status: TaskStatus.SUCCESS,
        input: defaultInput,
      });

      const result = await service.processTask(task, defaultInput);

      expect(result.status).toBe(TaskStatus.SUCCESS);
      expect(service.processWebhookTask).toHaveBeenCalledWith(
        expect.any(WebhookTaskConfig),
        defaultInput,
      );
    });

    it('should return error for webhook task', async () => {
      const task = new BaseTask(mockWebhookTask('wfId', ''));
      const taskLog = {
        status: TaskStatus.FAILED,
        input: defaultInput,
        error: {
          message: 'Failed to process task',
        },
      };
      jest.spyOn(service, 'processWebhookTask').mockResolvedValueOnce(taskLog);

      const result = await service.processTask(task, defaultInput);

      expect(result.status).toBe(TaskStatus.FAILED);
      expect(result.input).toBe(taskLog.input);
      expect(result.error).toBe(taskLog.error);
      expect(service.processWebhookTask).toHaveBeenCalledWith(
        expect.any(WebhookTaskConfig),
        defaultInput,
      );
    });

    it('should return result for telegram task', async () => {
      const task = new BaseTask(mockTelegramTask('wfId', ''));
      jest.spyOn(service, 'processTelegramTask').mockResolvedValueOnce({
        status: TaskStatus.SUCCESS,
        input: {
          message: 'Event test has been triggered',
        },
      });

      const result = await service.processTask(task, defaultInput);

      expect(result.status).toBe(TaskStatus.SUCCESS);
      expect(service.processTelegramTask).toHaveBeenCalledWith(
        expect.any(TelegramTaskConfig),
        defaultInput,
      );
    });

    it('should return error for telegram task', async () => {
      const task = new BaseTask(mockTelegramTask('wfId', ''));
      const taskLog = {
        status: TaskStatus.FAILED,
        input: {
          message: 'Event test has been triggered',
        },
        error: {
          message: 'Failed to process task',
        },
      };
      jest.spyOn(service, 'processTelegramTask').mockResolvedValueOnce(taskLog);

      const result = await service.processTask(task, defaultInput);

      expect(result.status).toBe(TaskStatus.FAILED);
      expect(result.input).toBe(taskLog.input);
      expect(result.error).toBe(taskLog.error);
      expect(service.processTelegramTask).toHaveBeenCalledWith(
        expect.any(TelegramTaskConfig),
        defaultInput,
      );
    });

    it('should return result for discord task', async () => {
      const task = new BaseTask(mockDiscordTask('wfId', ''));
      jest.spyOn(service, 'processDiscordTask').mockResolvedValueOnce({
        status: TaskStatus.SUCCESS,
        input: {
          message: 'Event test has been triggered',
        },
      });

      const result = await service.processTask(task, defaultInput);

      expect(result.status).toBe(TaskStatus.SUCCESS);
      expect(service.processDiscordTask).toHaveBeenCalledWith(
        expect.any(DiscordTaskConfig),
        defaultInput,
      );
    });

    it('should return error for discord task', async () => {
      const task = new BaseTask(mockDiscordTask('wfId', ''));
      const taskLog = {
        status: TaskStatus.FAILED,
        input: {
          message: 'Event test has been triggered',
        },
        error: {
          message: 'Failed to process task',
        },
      };
      jest.spyOn(service, 'processDiscordTask').mockResolvedValueOnce(taskLog);

      const result = await service.processTask(task, defaultInput);

      expect(result.status).toBe(TaskStatus.FAILED);
      expect(result.input).toBe(taskLog.input);
      expect(result.error).toBe(taskLog.error);
      expect(service.processDiscordTask).toHaveBeenCalledWith(
        expect.any(DiscordTaskConfig),
        defaultInput,
      );
    });
  });
});
