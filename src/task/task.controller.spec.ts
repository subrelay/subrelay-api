import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventService } from '../event/event.service';
import { ProcessTaskRequest } from './task.dto';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import {
  mockBlockJobData,
  mockChainEntity,
  mockEventEntity,
  mockFilterTask,
  mockUserEntity,
  mockWebhookTask,
} from '../../test/mock-data.util';
import { Event } from '../event/event.type';
import { UserService } from '../user/user.service';
import { TaskStatus } from './type/task.type';
import { EventRawData } from '../common/queue.type';
import { DataField } from '../event/event.dto';
import { GeneralTypeEnum } from '../substrate/substrate.type';
import { FilterVariableOperator } from './type/filter.type';

describe('TaskController', () => {
  let taskController: TaskController;
  let taskService: TaskService;
  let eventService: EventService;
  let userService: UserService;
  const chain = mockChainEntity();
  const eventEntity = mockEventEntity(chain.uuid);
  const user = mockUserEntity();
  const event: Event = {
    id: eventEntity.id,
    name: eventEntity.name,
    chain,
    schema: eventEntity.schema,
    description: eventEntity.description,
  };

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [TaskController],
      providers: [
        {
          provide: TaskService,
          useValue: {
            processTask: jest.fn(),
            getCustomMessageFields: jest.fn(),
            getFilterFields: jest.fn(),
            getOperatorMapping: jest.fn(),
          },
        },
        {
          provide: EventService,
          useValue: {
            getEventById: jest.fn(),
            generateEventRawDataSample: jest.fn(),
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

    taskController = moduleRef.get<TaskController>(TaskController);
    taskService = moduleRef.get<TaskService>(TaskService);
    eventService = moduleRef.get<EventService>(EventService);
    userService = moduleRef.get<UserService>(UserService);
  });

  describe('processTask', () => {
    it('should throw NotFoundException if event is not found', async () => {
      jest.spyOn(eventService, 'getEventById').mockResolvedValueOnce(undefined);
      const filterTask = mockFilterTask('workflowId', 'taskId');
      await expect(
        taskController.processTask(
          {
            data: { eventId: 'invalidId' },
            type: filterTask.type,
            config: filterTask.config,
          },
          user,
        ),
      ).rejects.toThrowError(NotFoundException);
    });

    it('should call taskService.processTask with correct arguments', async () => {
      const filterTask = mockFilterTask('workflowId', 'taskId');
      const input: ProcessTaskRequest = {
        data: { eventId: eventEntity.id },
        type: filterTask.type,
        config: filterTask.config,
      };
      const event: Event = {
        id: eventEntity.id,
        name: eventEntity.name,
        chain,
        schema: eventEntity.schema,
        description: eventEntity.description,
      };
      jest.spyOn(eventService, 'getEventById').mockResolvedValueOnce(event);
      jest.spyOn(userService, 'getUserById').mockResolvedValueOnce(user);
      jest
        .spyOn(eventService, 'generateEventRawDataSample')
        .mockReturnValueOnce({
          block: {
            hash: mockBlockJobData().hash,
          },
          data: {},
          success: true,
          timestamp: mockBlockJobData().timestamp,
        });
      jest.spyOn(taskService, 'processTask').mockResolvedValueOnce({
        status: TaskStatus.SUCCESS,
        error: null,
        output: null,
        startedAt: new Date(),
        finishedAt: new Date(),
      });

      const result = await taskController.processTask(input, user);

      expect(result).toEqual({
        status: TaskStatus.SUCCESS,
        error: null,
        output: null,
      });
    });

    it('should add encrypted to input with webhook task', async () => {
      const filterTask = mockWebhookTask('workflowId', 'taskId');
      const input: ProcessTaskRequest = {
        data: { eventId: eventEntity.id },
        type: filterTask.type,
        config: filterTask.config,
      };
      const event: Event = {
        id: eventEntity.id,
        name: eventEntity.name,
        chain,
        schema: eventEntity.schema,
        description: eventEntity.description,
      };
      jest.spyOn(eventService, 'getEventById').mockResolvedValueOnce(event);
      jest.spyOn(userService, 'getUserById').mockResolvedValueOnce(user);
      jest
        .spyOn(eventService, 'generateEventRawDataSample')
        .mockReturnValueOnce({
          block: {
            hash: mockBlockJobData().hash,
          },
          data: {},
          success: true,
          timestamp: mockBlockJobData().timestamp,
        });
      jest.spyOn(taskService, 'processTask').mockResolvedValueOnce({
        status: TaskStatus.SUCCESS,
        error: null,
        output: null,
        startedAt: new Date(),
        finishedAt: new Date(),
      });

      const result = await taskController.processTask(input, user);

      expect(result).toEqual({
        status: TaskStatus.SUCCESS,
        error: null,
        output: null,
      });

      expect(taskService.processTask).toHaveBeenCalledWith(
        {
          type: input.type,
          config: {
            ...input.config,
            encrypted: false,
          },
          id: expect.any(String),
          dependOn: undefined,
        },
        expect.anything(),
      );
    });
  });

  describe('getFilterVariableFields', () => {
    it('should throw NotFoundException if event is not found', async () => {
      jest.spyOn(eventService, 'getEventById').mockResolvedValueOnce(undefined);

      await expect(
        taskController.getFilterVariableFields('id'),
      ).rejects.toThrowError(NotFoundException);
    });

    it('should return filter fields for a valid event', async () => {
      const fields: DataField[] = [
        {
          name: 'Field 1',
          type: GeneralTypeEnum.STRING,
          data: {},
          description: '',
          display: 'Field 1',
          originalType: 'string',
        },
      ];
      jest.spyOn(eventService, 'getEventById').mockResolvedValueOnce(event);
      jest.spyOn(taskService, 'getFilterFields').mockReturnValueOnce(fields);

      const result = await taskController.getFilterVariableFields(event.id);

      expect(eventService.getEventById).toHaveBeenCalledWith(event.id);
      expect(taskService.getFilterFields).toHaveBeenCalledWith(event);
      expect(result).toEqual(fields);
    });
  });

  describe('getFilterVariableOperators', () => {
    it('should return filter operators', async () => {
      jest.spyOn(taskService, 'getOperatorMapping').mockReturnValueOnce({
        string: [FilterVariableOperator.EQUAL],
      });

      const result = await taskController.getFilterVariableOperators();

      expect(taskService.getOperatorMapping).toHaveBeenCalled();

      expect(result).toEqual({
        string: [
          {
            name: 'equal',
            value: FilterVariableOperator.EQUAL,
          },
        ],
      });
    });
  });

  describe('getCustomMessageFields', () => {
    it('should throw NotFoundException if event is not found', async () => {
      jest.spyOn(eventService, 'getEventById').mockResolvedValueOnce(undefined);

      await expect(
        taskController.getCustomMessageFields('id'),
      ).rejects.toThrowError(NotFoundException);
    });

    it('should return custom message fields for a valid event', async () => {
      const fields: DataField[] = [
        {
          name: 'Field 1',
          type: GeneralTypeEnum.STRING,
          data: {},
          description: '',
          display: 'Field 1',
          originalType: 'string',
        },
      ];
      jest.spyOn(eventService, 'getEventById').mockResolvedValueOnce(event);
      jest
        .spyOn(taskService, 'getCustomMessageFields')
        .mockReturnValueOnce(fields);

      const result = await taskController.getCustomMessageFields(event.id);

      expect(eventService.getEventById).toHaveBeenCalledWith(event.id);
      expect(taskService.getCustomMessageFields).toHaveBeenCalledWith(event);
      expect(result).toEqual(fields);
    });
  });

  describe('createProcessTaskInput', () => {
    const event: Event = {
      id: eventEntity.id,
      name: eventEntity.name,
      chain,
      schema: eventEntity.schema,
      description: eventEntity.description,
    };

    it('should return a valid ProcessTaskInput object', () => {
      const eventRawData: EventRawData = {
        timestamp: expect.any(Date),
        block: {
          hash: expect.any(String),
        },
        success: true,
        data: {},
      };

      jest
        .spyOn(eventService, 'generateEventRawDataSample')
        .mockReturnValueOnce(eventRawData);

      const result = taskController.createProcessTaskInput(user, event);

      expect(result).toEqual({
        event: {
          id: event.id,
          name: event.name,
          ...eventRawData,
          time: expect.any(Date),
          description: expect.any(String),
        },
        workflow: {
          id: expect.any(String),
          name: expect.any(String),
        },
        chain: {
          name: chain.name,
          uuid: chain.uuid,
        },
        user,
      });
    });
  });
});
