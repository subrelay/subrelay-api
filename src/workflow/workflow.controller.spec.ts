import { Test } from '@nestjs/testing';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import {
  CreateWorkFlowRequest,
  CreateWorkflowTaskRequest,
  GetWorkflowsOrderBy,
  UpdateWorkflowRequest,
  WorkflowTaskInput,
} from './workflow.dto';
import {
  mockDiscordTask,
  mockDiscordUser,
  mockEmailTask,
  mockEvent,
  mockFilterTask,
  mockTelegramTask,
  mockTelegramUser,
  mockTriggerTask,
  mockUserEntity,
  mockUserSummary,
  mockWebhookTask,
  mockWorkflowEntity,
} from '../../test/mock-data.util';
import { Workflow, WorkflowStatus } from './workflow.type';
import { UserService } from '../user/user.service';
import { TaskService } from '../task/task.service';
import { EventService } from '../event/event.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TaskType } from '../task/type/task.type';
import { TriggerTaskConfig } from '../task/type/trigger.type';
import { UserSummary } from '../user/user.dto';
import { ulid } from 'ulid';

describe('WorkflowController', () => {
  let controller: WorkflowController;
  let service: WorkflowService;
  let eventService: EventService;
  let taskService: TaskService;
  let userService: UserService;

  const user = mockUserSummary();
  const defaultWorkflow = mockWorkflowEntity();
  const defaultTriggerTask = mockTriggerTask('eventId', 'workflowId');
  const defaultFilterTask = mockFilterTask('workflowId', '');
  const defaultWebhookTask = mockWebhookTask('workflowId', '');
  const defaultTelegramTask = mockTelegramTask('workflowId', '');
  const defaultDiscordTask = mockDiscordTask('workflowId', '');
  const defaultWorkflowTaskRequests: CreateWorkflowTaskRequest[] = [
    defaultTriggerTask,
    {
      ...defaultFilterTask,
      dependOnName: defaultTriggerTask.name,
    },
    {
      ...defaultWebhookTask,
      dependOnName: defaultFilterTask.name,
    },
  ];

  const defaultWebhookWorkflowTasks: WorkflowTaskInput[] = [
    {
      ...defaultTriggerTask,
      dependOnIndex: -2,
    },
    {
      ...defaultFilterTask,
      dependOnName: defaultTriggerTask.name,
      dependOnIndex: 0,
    },
    {
      ...defaultWebhookTask,
      dependOnName: defaultFilterTask.name,
      dependOnIndex: 1,
    },
  ];

  const telegramWorkflowTasks: WorkflowTaskInput[] = [
    { ...defaultTriggerTask, dependOnIndex: -2 },
    {
      ...defaultFilterTask,
      dependOnName: defaultTriggerTask.name,
      dependOnIndex: 0,
    },
    {
      ...defaultTelegramTask,
      dependOnIndex: 0,
      dependOnName: defaultTriggerTask.name,
    },
  ];

  const discordWorkflowTasks: WorkflowTaskInput[] = [
    { ...defaultTriggerTask, dependOnIndex: -2 },
    {
      ...defaultFilterTask,
      dependOnName: defaultTriggerTask.name,
      dependOnIndex: 0,
    },
    {
      ...defaultDiscordTask,
      dependOnIndex: 0,
      dependOnName: defaultTriggerTask.name,
    },
  ];

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WorkflowController],
      providers: [
        {
          provide: WorkflowService,
          useValue: {
            getWorkflowsAndTotal: jest.fn(),
            createWorkflow: jest.fn(),
            workflowExists: jest.fn(),
            deleteWorkflow: jest.fn(),
            updateWorkflow: jest.fn(),
            getWorkflow: jest.fn(),
          },
        },
        {
          provide: EventService,
          useValue: {
            getEventById: jest.fn(),
          },
        },
        {
          provide: TaskService,
          useValue: {
            getTasks: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            getUserById: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get<WorkflowController>(WorkflowController);
    service = moduleRef.get<WorkflowService>(WorkflowService);
    eventService = moduleRef.get<EventService>(EventService);
    taskService = moduleRef.get<TaskService>(TaskService);
    userService = moduleRef.get<UserService>(UserService);
  });

  describe('getWorkflows', () => {
    it('should return workflows and total count', async () => {
      const workflows: Workflow[] = [defaultWorkflow];
      const total = 10;

      jest.spyOn(service, 'getWorkflowsAndTotal').mockResolvedValueOnce({
        workflows,
        total,
      });

      const result = await controller.getWorkflows(
        {
          offset: 0,
          limit: 1,
          order: GetWorkflowsOrderBy.CREATED_AT,
        },
        user,
      );

      expect(result.workflows).toEqual(workflows);
      expect(result.total).toEqual(total);
    });
  });

  describe('createWorkflow', () => {
    it('should create a workflow and return the workflow with tasks', async () => {
      const input: CreateWorkFlowRequest = {
        name: 'test',
        tasks: [
          { ...defaultTriggerTask },
          {
            ...defaultFilterTask,
            dependOnName: defaultTriggerTask.name,
          },
          {
            ...defaultWebhookTask,
            dependOnName: defaultFilterTask.name,
          },
        ],
      };

      const userEntity = mockUserEntity();
      const userInfo: UserSummary = {
        id: userEntity.id,
        address: userEntity.address,
      };
      const event = mockEvent();
      const workflow: Workflow = {
        id: ulid(),
        name: input.name,
        status: WorkflowStatus.RUNNING,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: userInfo.id,
        chain: {
          uuid: event.chain.uuid,
          name: event.chain.name,
          imageUrl: event.chain.imageUrl,
        },
        event: {
          id: event.id,
          name: event.name,
          description: event.description,
        },
      };
      const expectedTasks = input.tasks.map((t) => ({
        ...t,
        id: ulid(),
        workflowId: workflow.id,
      }));
      jest.spyOn(eventService, 'getEventById').mockResolvedValueOnce(event);
      jest.spyOn(userService, 'getUserById').mockResolvedValueOnce(userEntity);
      jest.spyOn(service, 'createWorkflow').mockResolvedValueOnce(workflow);
      jest
        .spyOn(controller, 'modifyTaskRequests')
        .mockReturnValueOnce(defaultWebhookWorkflowTasks);
      jest.spyOn(taskService, 'getTasks').mockResolvedValueOnce(expectedTasks);

      const result = await controller.createWorkflow(input, userInfo);

      expect(result).toEqual({
        ...workflow,
        tasks: expectedTasks,
      });
      expect(eventService.getEventById).toHaveBeenCalledWith(
        defaultTriggerTask.config.eventId,
      );
      expect(userService.getUserById).toHaveBeenCalledWith(userEntity.id);
      expect(taskService.getTasks).toHaveBeenCalledWith(workflow.id);
      expect(service.createWorkflow).toHaveBeenCalledWith(
        input.name,
        defaultWebhookWorkflowTasks,
        userInfo.id,
      );
    });

    it('should handle errors if the request is invalid', async () => {
      const input = {
        name: 'test',
        tasks: [defaultWorkflowTaskRequests[0]],
      };

      const error = new BadRequestException('Invalid request');
      jest
        .spyOn(controller, 'validateWorkflowTasks')
        .mockRejectedValueOnce(error);

      const userInfo: UserSummary = mockUserSummary();

      expect(() => controller.createWorkflow(input, userInfo)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateTaskCount', () => {
    it('throws an error when tasks length is less than 2', () => {
      const tasks = [];
      expect(() => controller.validateTaskCount(tasks)).toThrow(
        'Workflow should have at least 2 tasks.',
      );
    });

    it('does not throw an error when tasks length is 2 or more', () => {
      expect(() =>
        controller.validateTaskCount(defaultWebhookWorkflowTasks),
      ).not.toThrow();
    });
  });

  describe('deleteWorkflow', () => {
    it('workflow exists', async () => {
      const id = 'workflow_id';
      const user = mockUserSummary();

      jest.spyOn(service, 'workflowExists').mockResolvedValueOnce(true);
      jest.spyOn(service, 'deleteWorkflow').mockResolvedValueOnce(undefined);

      await controller.deleteWorkflow(id, user);

      expect(service.workflowExists).toHaveBeenCalledWith(id, user.id);
      expect(service.deleteWorkflow).toHaveBeenCalledWith(id, user.id);
    });

    it('workflow does not exist', async () => {
      const id = 'workflow_id';
      const user = mockUserSummary();
      jest.spyOn(service, 'workflowExists').mockResolvedValueOnce(false);

      await expect(controller.deleteWorkflow(id, user)).rejects.toThrow(
        NotFoundException,
      );

      expect(service.workflowExists).toHaveBeenCalledWith(id, user.id);
      expect(service.deleteWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('updateWorkflow', () => {
    it('should throw NotFoundException if workflow does not exist', async () => {
      const id = 'workflowId';
      const input: UpdateWorkflowRequest = {
        name: ulid(),
        status: WorkflowStatus.PAUSING,
      };
      const user: UserSummary = mockUserSummary();
      jest.spyOn(service, 'workflowExists').mockResolvedValueOnce(false);

      await expect(
        controller.updateWorkflow(id, input, user),
      ).rejects.toThrowError(NotFoundException);
      expect(service.updateWorkflow).not.toHaveBeenCalled();
    });

    it('should call workflowService.updateWorkflow with correct parameters if workflow exists', async () => {
      const id = 'workflowId';
      const input: UpdateWorkflowRequest = {
        name: ulid(),
        status: WorkflowStatus.PAUSING,
      };
      const user: UserSummary = mockUserSummary();
      jest.spyOn(service, 'workflowExists').mockResolvedValueOnce(true);
      jest.spyOn(service, 'updateWorkflow').mockResolvedValueOnce(undefined);

      await controller.updateWorkflow(id, input, user);

      expect(service.updateWorkflow).toHaveBeenCalledWith(id, input);
    });
  });

  describe('validateTaskNames', () => {
    it('should throw an error if task names are not unique', () => {
      const tasks: WorkflowTaskInput[] = [
        { ...defaultTriggerTask, dependOnIndex: -2 },
        {
          ...defaultFilterTask,
          dependOnName: defaultTriggerTask.name,
          dependOnIndex: 0,
        },
        {
          ...defaultTriggerTask,
          dependOnIndex: 1,
          dependOnName: defaultFilterTask.name,
        },
      ];

      expect(() => {
        controller.validateTaskNames(tasks);
      }).toThrowError('Task names in a workflow should be unique.');
    });

    it('should not throw an error if task names are unique', () => {
      expect(() => {
        controller.validateTaskNames(defaultWebhookWorkflowTasks);
      }).not.toThrow();
    });
  });

  describe('validateEvent', () => {
    it('should throw BadRequestException when event is not found', async () => {
      const eventId = 'non-existent-event-id';
      jest.spyOn(eventService, 'getEventById').mockResolvedValueOnce(null);

      await expect(controller.validateEvent(eventId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should not throw any exception when event is found', async () => {
      const event = mockEvent();
      jest.spyOn(eventService, 'getEventById').mockResolvedValueOnce(event);
      await expect(controller.validateEvent(event.id)).resolves.not.toThrow();
    });
  });

  describe('validateDependingTasks', () => {
    it('should throw an exception when there are missing depending tasks', () => {
      const tasks: WorkflowTaskInput[] = [
        { ...defaultTriggerTask, dependOnIndex: -2 },
        {
          ...defaultFilterTask,
          dependOnName: defaultTriggerTask.name,
          dependOnIndex: 0,
        },
        {
          ...defaultWebhookTask,
          dependOnIndex: null,
          dependOnName: null,
        },
      ];

      expect(() => controller.validateDependingTasks(tasks)).toThrow(
        `${defaultWebhookTask.name} task(s) have to depend on another task.`,
      );
    });

    it('should throw an exception when there are invalid depending tasks', () => {
      const tasks: WorkflowTaskInput[] = [
        { ...defaultTriggerTask, dependOnIndex: -2 },
        {
          ...defaultFilterTask,
          dependOnName: defaultTriggerTask.name,
          dependOnIndex: 0,
        },
        {
          ...defaultWebhookTask,
          dependOnIndex: -1,
          dependOnName: 'invalid task',
        },
      ];

      expect(() => controller.validateDependingTasks(tasks)).toThrow(
        `${defaultWebhookTask.name} task(s) depend on an invalid task.`,
      );
    });

    it('should not throw an exception when all tasks have valid dependencies', () => {
      expect(() =>
        controller.validateDependingTasks(defaultWebhookWorkflowTasks),
      ).not.toThrow();
    });
  });

  describe('getWorkflow', () => {
    it('should throw NotFoundException if workflow is not found', async () => {
      const id = 'workflow-id';
      const user = mockUserSummary();

      jest.spyOn(service, 'getWorkflow').mockResolvedValueOnce(null);

      await expect(controller.getWorkflow(id, user)).rejects.toThrowError(
        NotFoundException,
      );
    });

    it('should return the workflow and tasks if found', async () => {
      const user = mockUserSummary();

      const event = mockEvent();
      const workflow: Workflow = {
        id: ulid(),
        name: ulid(),
        status: WorkflowStatus.RUNNING,
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: user.id,
        chain: {
          uuid: event.chain.uuid,
          name: event.chain.name,
          imageUrl: event.chain.imageUrl,
        },
        event: {
          id: event.id,
          name: event.name,
          description: event.description,
        },
      };
      const tasks = defaultWebhookWorkflowTasks.map((t) => ({
        ...t,
        id: ulid(),
        workflowId: workflow.id,
      }));
      jest.spyOn(service, 'getWorkflow').mockResolvedValueOnce(workflow);
      jest.spyOn(taskService, 'getTasks').mockResolvedValueOnce(tasks);

      const result = await controller.getWorkflow(workflow.id, user);

      expect(result).toEqual({ ...workflow, tasks });
      expect(service.getWorkflow).toHaveBeenCalledWith(workflow.id, user.id);
      expect(taskService.getTasks).toHaveBeenCalledWith(workflow.id);
    });
  });

  describe('validateDuplicateDependingTasks', () => {
    it('should throw BadRequestException if tasks have duplicate dependOnIndex', () => {
      const tasks: WorkflowTaskInput[] = [
        { ...defaultTriggerTask, dependOnIndex: -2 },
        {
          ...defaultFilterTask,
          dependOnName: defaultTriggerTask.name,
          dependOnIndex: 0,
        },
        {
          ...defaultWebhookTask,
          dependOnIndex: 0,
          dependOnName: defaultTriggerTask.name,
        },
      ];

      expect(() => controller.validateDuplicateDependingTasks(tasks)).toThrow(
        BadRequestException,
      );
    });

    it('should not throw an exception if tasks do not have duplicate dependOnIndex', () => {
      expect(() =>
        controller.validateDuplicateDependingTasks(defaultWebhookWorkflowTasks),
      ).not.toThrow();
    });
  });

  describe('validateIntegration', () => {
    it('should throw BadRequestException if user does not set up Telegram integration', () => {
      const user = { ...mockUserEntity(), integration: {} };

      expect(() =>
        controller.validateIntegration(
          user,
          telegramWorkflowTasks,
          TaskType.TELEGRAM,
        ),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user does not set up Discord integration', () => {
      const user = { ...mockUserEntity(), integration: {} };

      expect(() =>
        controller.validateIntegration(
          user,
          discordWorkflowTasks,
          TaskType.DISCORD,
        ),
      ).toThrow(BadRequestException);
    });

    it('should not throw BadRequestException if user has been set up Telegram integration', () => {
      const user = {
        ...mockUserEntity(),
        integration: {
          telegram: mockTelegramUser(),
        },
      };

      expect(() =>
        controller.validateIntegration(
          user,
          telegramWorkflowTasks,
          TaskType.TELEGRAM,
        ),
      ).not.toThrow(BadRequestException);
    });

    it('should not throw BadRequestException if user has been set up Discord integration', () => {
      const user = {
        ...mockUserEntity(),
        integration: {
          discord: mockDiscordUser(),
        },
      };

      expect(() =>
        controller.validateIntegration(
          user,
          discordWorkflowTasks,
          TaskType.DISCORD,
        ),
      ).not.toThrow(BadRequestException);
    });

    it('should not throw BadRequestException if the input does not contain Telegram or Discord task', () => {
      const user = {
        ...mockUserEntity(),
        integration: {
          discord: mockDiscordUser(),
          telegram: mockTelegramUser(),
        },
      };

      expect(() =>
        controller.validateIntegration(
          user,
          defaultWebhookWorkflowTasks,
          TaskType.DISCORD,
        ),
      ).not.toThrow(BadRequestException);
    });
  });

  describe('validateTriggerTask', () => {
    it('should throw BadRequestException when there are no trigger tasks', () => {
      const tasks: WorkflowTaskInput[] = [];
      expect(() => {
        controller.validateTriggerTask(tasks);
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException when there are more than one trigger tasks', () => {
      const tasks: WorkflowTaskInput[] = [
        {
          ...defaultTriggerTask,
          dependOnIndex: -2,
        },
        {
          ...defaultTriggerTask,
          dependOnIndex: -2,
        },
        {
          ...defaultWebhookTask,
          dependOnIndex: 0,
        },
      ];
      expect(() => {
        controller.validateTriggerTask(tasks);
      }).toThrow(BadRequestException);
    });

    it('should not throw any exception when there is exactly one trigger task', () => {
      expect(() => {
        controller.validateTriggerTask(defaultWebhookWorkflowTasks);
      }).not.toThrow();
    });
  });

  describe('getTriggerTaskConfig', () => {
    it('should throw BadRequestException if no trigger task is found', () => {
      const tasks: WorkflowTaskInput[] = [
        {
          ...defaultDiscordTask,
          dependOnIndex: -2,
        },
      ];

      expect(() => controller.getTriggerTaskConfig(tasks)).toThrowError(
        BadRequestException,
      );
    });

    it('should return the TriggerTaskConfig if a trigger task is found', () => {
      const result = controller.getTriggerTaskConfig(
        defaultWebhookWorkflowTasks,
      );
      expect(result).toBeInstanceOf(TriggerTaskConfig);
    });
  });

  describe('modifyTaskRequests', () => {
    it('should return an empty array when tasks array is empty', () => {
      const tasks: CreateWorkflowTaskRequest[] = [];
      const result = controller.modifyTaskRequests(tasks);
      expect(result).toEqual([]);
    });

    it('should return the same array when tasks array has only one element', () => {
      const tasks: CreateWorkflowTaskRequest[] = [defaultTriggerTask];
      const expectedResult: WorkflowTaskInput[] = [
        {
          ...tasks[0],
          dependOnIndex: -2,
        },
      ];
      const result = controller.modifyTaskRequests(tasks);
      expect(result).toEqual(expectedResult);
    });

    it('should return the tasks array sorted by dependOnIndex when tasks array has multiple elements', () => {
      const tasks: CreateWorkflowTaskRequest[] = [
        ...defaultWorkflowTaskRequests,
      ];
      const result = controller.modifyTaskRequests(tasks);
      expect(result).toHaveLength(3);
      expect(result).toEqual(defaultWebhookWorkflowTasks);
    });
  });
});
