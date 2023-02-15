import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { find, get } from 'lodash';
import { WorkflowJobData } from '../common/queue.type';
import { TaskService } from '../task/task.service';
import { ProcessStatus, TaskOutput, TaskType } from '../task/type/task.type';
import { WorkflowService } from './workflow.service';

@Processor('workflow')
export class WorkflowProcessor {
  private readonly logger = new Logger(WorkflowProcessor.name);
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly taskService: TaskService,
  ) {}

  @Process({ concurrency: 10 })
  async processWorkflowJob(job: Job) {
    const data: WorkflowJobData = job.data;
    const outputs: {
      [key: number]: TaskOutput;
    } = {};
    this.logger.debug(
      `Process event "${data.event.name}" for workflow version ${data.workflowVersionId}`,
    );

    const tasks = await this.taskService.getTasks(data.workflowVersionId);

    // TODO refactor code
    const triggerTask = find(tasks, { type: TaskType.TRIGGER });
    const startedAt = new Date();
    const triggerTaskOutput = await this.taskService.processTask(triggerTask, {
      eventData: data.eventData,
      event: data.event,
    });

    if (!triggerTaskOutput.output?.match) {
      this.logger.debug(`Not match conditions. Skip!`);
      // event does not match
      return true;
    }

    const workflowLogId = await this.workflowService.createWorkflowLog({
      input: data.eventData,
      workflowVersionId: data.workflowVersionId,
    });
    await this.taskService.createTaskLogs([
      {
        status: ProcessStatus.SUCCESS,
        taskId: triggerTask.id,
        workflowLogId,
        output: triggerTaskOutput,
        startedAt,
        finishedAt: new Date(),
      },
    ]);
    outputs[triggerTask.id] = triggerTaskOutput;

    const otherTasks = tasks.filter((task) => task.id !== triggerTask.id);
    const taskLogs = await this.taskService.createTaskLogs(
      otherTasks.map((task) => ({
        status: ProcessStatus.PENDING,
        taskId: task.id,
        workflowLogId,
      })),
    );

    const workflow = await this.workflowService.getWorkflowSummaryByVersionId(
      data.workflowVersionId,
    );

    for (const task of otherTasks) {
      const taskLog = find(taskLogs, { taskId: task.id });
      await this.taskService.updateTaskLogStatus(
        taskLog.id,
        ProcessStatus.RUNNING,
      );

      const output = await this.taskService.processTask(task, {
        eventData: data.eventData,
        event: data.event,
        input: get(outputs, task.dependOn),
        workflow,
      });

      outputs[task.id] = output;

      if (!output.success) {
        await this.taskService.finishTaskLog(taskLog.id, {
          status: ProcessStatus.FAILED,
          output,
        });
        await this.taskService.skipPendingTaskLogs(workflowLogId);
        await this.workflowService.finishWorkflowLog(
          workflowLogId,
          ProcessStatus.FAILED,
        );

        return;
      } else {
        await this.taskService.finishTaskLog(taskLog.id, {
          status: ProcessStatus.FAILED,
          output,
        });
      }
    }

    await this.workflowService.finishWorkflowLog(
      workflowLogId,
      ProcessStatus.SUCCESS,
    );

    this.logger.debug('Finished process workflow');
  }
}
