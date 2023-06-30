import { Test } from '@nestjs/testing';
import { WorkflowService } from './workflow.service';
import {
  GetWorkflowLogsOrderBy,
  GetWorkflowLogsQueryParams,
} from './workflow.dto';
import {
  mockTaskLogEntity,
  mockTriggerTask,
  mockUserSummary,
  mockWebhookTask,
} from '../../test/mock-data.util';
import { WorkflowLogSummary } from './workflow.type';
import { TaskService } from '../task/task.service';
import { NotFoundException } from '@nestjs/common';
import { TaskStatus } from '../task/type/task.type';
import { UserSummary } from '../user/user.dto';
import { ulid } from 'ulid';
import { WorkflowLogController } from './workflow-log.controller';

describe('WorkflowLogController', () => {
  let controller: WorkflowLogController;
  let service: WorkflowService;
  let taskService: TaskService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WorkflowLogController],
      providers: [
        {
          provide: WorkflowService,
          useValue: {
            getWorkflowLogsAndTotal: jest.fn(),
            getWorkflowLog: jest.fn(),
            workflowExists: jest.fn(),
          },
        },

        {
          provide: TaskService,
          useValue: {
            getTaskLogs: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get<WorkflowLogController>(WorkflowLogController);
    service = moduleRef.get<WorkflowService>(WorkflowService);
    taskService = moduleRef.get<TaskService>(TaskService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('orderTaskLogs', () => {
    test('should order task logs based on dependency', () => {
      const workflowId = ulid();
      const eventId = ulid();
      const triggerTask = mockTriggerTask(eventId, workflowId);
      const webhookTask = mockWebhookTask(workflowId, triggerTask.id);
      const triggerTaskLog = mockTaskLogEntity(triggerTask);
      const webhookTaskLog = mockTaskLogEntity(webhookTask);

      const logs = [webhookTaskLog, triggerTaskLog];

      const orderedLogs = controller.orderTaskLogs(logs);

      expect(orderedLogs).toEqual([triggerTaskLog, webhookTaskLog]);
    });

    test('should handle empty task logs', () => {
      const logs: any[] = [];
      const orderedLogs = controller.orderTaskLogs(logs);
      expect(orderedLogs).toEqual([]);
    });
  });

  describe('getWorkflowLogs', () => {
    it('should return workflow logs and total', async () => {
      const queryParams: GetWorkflowLogsQueryParams = {
        order: GetWorkflowLogsOrderBy.FINISHED_AT,
        limit: 0,
        offset: 0,
      };
      const user: UserSummary = mockUserSummary();

      const expectedResponse = {
        workflowLogs: [
          {
            id: ulid(),
            startedAt: new Date(),
            finishedAt: new Date(),
            status: TaskStatus.SUCCESS,
            input: {},
            chain: {
              uuid: '123',
              name: 'test',
              imageUrl: '',
            },
            workflow: {
              id: ulid(),
              name: 'test',
            },
          },
        ],
        total: 1,
        limit: queryParams.limit,
        offset: queryParams.offset,
      };

      jest
        .spyOn(service, 'getWorkflowLogsAndTotal')
        .mockResolvedValueOnce(expectedResponse);

      const result = await controller.getWorkflowLogs(queryParams, user);

      expect(service.getWorkflowLogsAndTotal).toHaveBeenCalledWith(
        queryParams,
        user.id,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getWorkflowLog', () => {
    it('should return workflow log with ordered task logs', async () => {
      const user = mockUserSummary();

      const expectedWorkflowLog: WorkflowLogSummary = {
        id: ulid(),
        startedAt: new Date(),
        finishedAt: new Date(),
        status: TaskStatus.SUCCESS,
        input: {},
        chain: {
          uuid: '123',
          name: 'test',
          imageUrl: '',
        },
        workflow: {
          id: ulid(),
          name: 'test',
        },
      };
      const expectedTaskLogs = [
        mockTaskLogEntity(mockTriggerTask('123', '123')),
        mockTaskLogEntity(mockWebhookTask('123', '123')),
      ];
      jest
        .spyOn(service, 'getWorkflowLog')
        .mockResolvedValueOnce(expectedWorkflowLog);
      jest
        .spyOn(taskService, 'getTaskLogs')
        .mockResolvedValueOnce(expectedTaskLogs);

      const result = await controller.getWorkflowLog(
        expectedWorkflowLog.id,
        user,
      );

      expect(result).toEqual({
        ...expectedWorkflowLog,
        taskLogs: expectedTaskLogs,
      });
      expect(service.getWorkflowLog).toHaveBeenCalledWith(
        expectedWorkflowLog.id,
        user.id,
      );
      expect(taskService.getTaskLogs).toHaveBeenCalledWith(
        expectedWorkflowLog.id,
      );
    });

    it('should throw NotFoundException if workflow log is not found', async () => {
      const id = '123';
      const user = mockUserSummary();

      jest.spyOn(service, 'getWorkflowLog').mockResolvedValueOnce(null);

      await expect(controller.getWorkflowLog(id, user)).rejects.toThrowError(
        NotFoundException,
      );
      expect(service.getWorkflowLog).toHaveBeenCalledWith(id, user.id);
    });
  });
});
