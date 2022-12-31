import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { filter, find, get, omit, omitBy, orderBy, toPairs } from 'lodash';
import { EventData, WorkflowJobData } from 'src/common/queue.type';
import { EventService } from 'src/event/event.service';
import { TaskLog } from 'src/task/entity/task-log.entity';
import { TaskService } from 'src/task/task.service';
import { ProcessStatus, TaskOutput, TaskType } from 'src/task/type/task.type';
import { WorkflowService } from './workflow.service';

@Processor('workflow')
export class BlockProcessor {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly eventService: EventService,
    private readonly taskService: TaskService,
  ) {}

  @Process({ concurrency: 10 })
  async processWorkflowJob(job: Job) {
    const data: WorkflowJobData = job.data;
    let outputs: {
      [key: number]: TaskOutput;
    } = {};
    let status = ProcessStatus.SUCCESS;

    const tasks = await this.taskService.getTasks(data.workflowVersionId);
    const triggerTask = find(tasks, { type: TaskType.TRIGGER });
    let triggerTaskOutput = await this.taskService.processTask(triggerTask, {
      event: data.eventData,
    });

    if (!triggerTaskOutput.output?.match) {
      // event does not match
      return true;
    }

    let workflowLogId = await this.workflowService.createWorkflowLog({
      input: data.eventData,
      workflowVersionId: data.workflowVersionId,
    });
    await this.taskService.createTaskLogs([
      {
        status: ProcessStatus.SUCCESS,
        taskId: triggerTask.id,
        workflowLogId,
        output: triggerTaskOutput,
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

    for (const task of otherTasks) {
      const taskLog = find(taskLogs, { taskId: task.id });
      await this.taskService.updateTaskLogStatus(
        taskLog.id,
        ProcessStatus.RUNNING,
      );

      let output = await this.taskService.processTask(task, {
        event: data.eventData,
        input: get(outputs, task.dependOn),
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
  }
}
