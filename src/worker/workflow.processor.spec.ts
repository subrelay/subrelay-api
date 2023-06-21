import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowProcessor } from './workflow.processor';
import { WorkflowService } from '../workflow/workflow.service';
import { TaskService } from '../task/task.service';
import { Logger } from '@nestjs/common';
import { BaseTask, TaskLog, TaskStatus } from '../task/type/task.type';
import {
  mockBlockJobData,
  mockChainEntity,
  mockEventEntity,
  mockFilterTask,
  mockTriggerTask,
  mockUserEntity,
  mockWebhookTask,
  mockWorkflowEntity,
} from '../../test/mock-data.util';
import { ProcessWorkflowInput } from '../workflow/workflow.type';
import { EventRawData } from '../common/queue.type';
import { TaskEntity } from '../task/entity/task.entity';
import { Job } from 'bull';
import { ulid } from 'ulid';

describe('WorkflowProcessor', () => {
  let processor: WorkflowProcessor;
  let workflowService: WorkflowService;
  let taskService: TaskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowProcessor,
        {
          provide: WorkflowService,
          useValue: {
            processWorkflow: jest.fn(),
            createWorkflowLog: jest.fn().mockResolvedValue(ulid()),
            finishWorkflowLog: jest.fn(),
          },
        },
        {
          provide: TaskService,
          useValue: {
            getTasks: jest.fn(),
            createTaskLogs: jest.fn(),
          },
        },
        { provide: Logger, useValue: {} },
      ],
    }).compile();

    processor = module.get<WorkflowProcessor>(WorkflowProcessor);
    workflowService = module.get<WorkflowService>(WorkflowService);
    taskService = module.get<TaskService>(TaskService);
  });

  describe('processWorkflowJob', () => {
    const chain = mockChainEntity();
    const user = mockUserEntity();
    const event = mockEventEntity(chain.uuid);
    const workflow = mockWorkflowEntity(user, event, chain);
    const block = mockBlockJobData();

    const eventData: EventRawData = {
      data: {
        who: 'F3opxRbN5ZbjJNU511Kj2TLuzFcDq9BGduA9TgiECafpg29',
        amount: '0.0422',
      },
      success: true,
      timestamp: Date.now(),
      block: {
        hash: block.hash,
      },
    };

    const data = {
      user,
      chain: {
        uuid: chain.uuid,
        name: chain.name,
      },
      workflow: {
        id: workflow.id,
        name: workflow.name,
      },
      event: {
        id: event.id,
        name: event.name,
        description: event.description,
        data: eventData,
        time: new Date(),
      },
    } as ProcessWorkflowInput;

    it('should process the workflow and create task logs', async () => {
      const workflowResult: { [key: string]: TaskLog } = {
        [workflow.tasks[0].id]: {
          status: TaskStatus.SUCCESS,
          startedAt: new Date(),
          finishedAt: new Date(),
          input: '123123',
        },
        [workflow.tasks[1].id]: {
          status: TaskStatus.SUCCESS,
          startedAt: new Date(),
          finishedAt: new Date(),
          output: '234234',
        },
      };
      const input = { data } as any as Job;

      jest
        .spyOn(taskService, 'getTasks')
        .mockResolvedValueOnce(workflow.tasks as any as TaskEntity[]);
      jest
        .spyOn(workflowService, 'processWorkflow')
        .mockResolvedValueOnce(workflowResult);

      jest
        .spyOn(workflowService, 'processWorkflow')
        .mockResolvedValueOnce(workflowResult);

      await processor.processWorkflowJob(input);

      expect(taskService.getTasks).toHaveBeenCalledWith(workflow.id, false);
      expect(workflowService.processWorkflow).toHaveBeenCalledWith(input.data, {
        start: {
          id: workflow.tasks[0].id,
          dependOn: workflow.tasks[0].dependOn,
          type: workflow.tasks[0].type,
          config: { eventId: workflow.tasks[0].config.eventId },
          name: workflow.tasks[0].name,
          workflowId: workflow.id,
        },
        [workflow.tasks[0].id]: {
          id: workflow.tasks[1].id,
          dependOn: workflow.tasks[1].dependOn,
          type: workflow.tasks[1].type,
          config: {
            secret: null,
            encrypted: false,
            url: workflow.tasks[1].config.url,
          },
          name: workflow.tasks[1].name,
          workflowId: workflow.id,
        },
      } as unknown as BaseTask[]);

      expect(workflowService.createWorkflowLog).toHaveBeenCalledWith({
        input: input.data.event.data,
        workflowId: workflow.id,
      });
      expect(taskService.createTaskLogs).toHaveBeenCalledWith([
        {
          id: expect.any(String),
          status: TaskStatus.SUCCESS,
          taskId: workflow.tasks[0].id,
          workflowLogId: expect.any(String),
          output: workflowResult[workflow.tasks[0].id].output,
          startedAt: workflowResult[workflow.tasks[0].id].startedAt,
          finishedAt: workflowResult[workflow.tasks[0].id].finishedAt,
          input: workflowResult[workflow.tasks[0].id].input,
          error: undefined,
        },
        {
          id: expect.any(String),
          status: TaskStatus.SUCCESS,
          taskId: workflow.tasks[1].id,
          workflowLogId: expect.any(String),
          output: workflowResult[workflow.tasks[1].id].output,
          startedAt: workflowResult[workflow.tasks[1].id].startedAt,
          finishedAt: workflowResult[workflow.tasks[1].id].finishedAt,
          input: workflowResult[workflow.tasks[1].id].input,
          error: undefined,
        },
      ]);
      expect(workflowService.finishWorkflowLog).toHaveBeenCalledWith(
        expect.any(String),
        TaskStatus.SUCCESS,
      );
    });

    it('should skip task logs if filter task fails', async () => {
      const triggerTask = mockTriggerTask(workflow.event.id, workflow.id);
      const filterTask = mockFilterTask(workflow.id, triggerTask.id);
      const webhookTask = mockWebhookTask(workflow.id, filterTask.id);
      const newWorkflow = { ...workflow };
      newWorkflow.tasks = [triggerTask, filterTask, webhookTask];
      const workflowResult: { [key: string]: TaskLog } = {
        [newWorkflow.tasks[0].id]: {
          status: TaskStatus.SUCCESS,
          startedAt: new Date(),
          finishedAt: new Date(),
          input: '123123',
        },
        [newWorkflow.tasks[1].id]: {
          status: TaskStatus.SUCCESS,
          startedAt: new Date(),
          finishedAt: new Date(),
          output: {
            match: false,
          },
        },
        [newWorkflow.tasks[2].id]: {
          status: TaskStatus.SKIPPED,
          startedAt: new Date(),
          finishedAt: new Date(),
        },
      };
      const input = { data } as any as Job;

      jest
        .spyOn(taskService, 'getTasks')
        .mockResolvedValueOnce(newWorkflow.tasks as any as TaskEntity[]);
      jest
        .spyOn(workflowService, 'processWorkflow')
        .mockResolvedValueOnce(workflowResult);
      jest
        .spyOn(workflowService, 'processWorkflow')
        .mockResolvedValueOnce(workflowResult);

      await processor.processWorkflowJob(input);

      expect(taskService.getTasks).toHaveBeenCalledWith(newWorkflow.id, false);
      expect(workflowService.processWorkflow).toHaveBeenCalled();
      expect(workflowService.createWorkflowLog).not.toHaveBeenCalled();
    });

    it('should process the workflow with failed task and create task logs', async () => {
      const triggerTask = mockTriggerTask(workflow.event.id, workflow.id);
      const filterTask = mockFilterTask(workflow.id, triggerTask.id);
      const webhookTask = mockWebhookTask(workflow.id, filterTask.id);
      const newWorkflow = { ...workflow };
      newWorkflow.tasks = [triggerTask, filterTask, webhookTask];
      const workflowResult: { [key: string]: TaskLog } = {
        [newWorkflow.tasks[0].id]: {
          status: TaskStatus.SUCCESS,
          startedAt: new Date(),
          finishedAt: new Date(),
          input: '123123',
        },
        [newWorkflow.tasks[1].id]: {
          status: TaskStatus.FAILED,
          startedAt: new Date(),
          finishedAt: new Date(),
          error: {
            message: 'Failed to process this task',
          },
        },
      };
      const input = { data } as any as Job;

      jest
        .spyOn(taskService, 'getTasks')
        .mockResolvedValueOnce(newWorkflow.tasks as any as TaskEntity[]);
      jest
        .spyOn(workflowService, 'processWorkflow')
        .mockResolvedValueOnce(workflowResult);
      jest
        .spyOn(workflowService, 'processWorkflow')
        .mockResolvedValueOnce(workflowResult);

      await processor.processWorkflowJob(input);

      expect(taskService.getTasks).toHaveBeenCalledWith(newWorkflow.id, false);

      expect(taskService.createTaskLogs).toHaveBeenCalledWith([
        {
          id: expect.any(String),
          status: TaskStatus.SUCCESS,
          taskId: newWorkflow.tasks[0].id,
          workflowLogId: expect.any(String),
          output: workflowResult[newWorkflow.tasks[0].id].output,
          startedAt: workflowResult[newWorkflow.tasks[0].id].startedAt,
          finishedAt: workflowResult[newWorkflow.tasks[0].id].finishedAt,
          input: workflowResult[newWorkflow.tasks[0].id].input,
          error: undefined,
        },
        {
          id: expect.any(String),
          status: TaskStatus.FAILED,
          taskId: newWorkflow.tasks[1].id,
          workflowLogId: expect.any(String),
          output: workflowResult[newWorkflow.tasks[1].id].output,
          startedAt: workflowResult[newWorkflow.tasks[1].id].startedAt,
          finishedAt: workflowResult[newWorkflow.tasks[1].id].finishedAt,
          input: workflowResult[newWorkflow.tasks[1].id].input,
          error: workflowResult[newWorkflow.tasks[1].id].error,
        },
        {
          id: expect.any(String),
          status: TaskStatus.SKIPPED,
          taskId: newWorkflow.tasks[2].id,
          workflowLogId: expect.any(String),
          output: undefined,
          startedAt: undefined,
          finishedAt: undefined,
          input: undefined,
          error: undefined,
        },
      ]);
      expect(workflowService.finishWorkflowLog).toHaveBeenCalledWith(
        expect.any(String),
        TaskStatus.FAILED,
      );
    });
  });
});
