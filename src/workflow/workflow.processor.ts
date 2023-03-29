import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { isEmpty, map } from 'lodash';
import { WorkflowJobData } from '../common/queue.type';
import { TaskService } from '../task/task.service';
import { BaseTask, TaskStatus } from '../task/type/task.type';
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
    const { workflow, eventRawData }: WorkflowJobData = job.data;
    this.logger.debug(
      `Process event "${workflow.event.name}" for workflow version ${workflow.id}`,
    );

    const tasks = await this.taskService.getTasks(workflow.id);
    const schema = {};
    tasks.forEach((task) => {
      schema[task.dependOn || 'start'] = new BaseTask(task);
    });

    const workflowResult = await this.workflowService.processWorkflow(
      { eventRawData, workflow },
      schema,
    );

    if (isEmpty(workflowResult)) {
      this.logger.debug(`Event not match!`);
      return;
    }

    let workflowLogStatus = TaskStatus.SUCCESS;
    const workflowLogId = await this.workflowService.createWorkflowLog({
      input: eventRawData,
      workflowId: workflow.id,
    });
    const taskLogs = map(workflowResult, (log, taskId) => {
      if (!log.success) {
        workflowLogStatus = TaskStatus.FAILED;
      }

      return {
        status: log.success ? TaskStatus.SUCCESS : TaskStatus.FAILED,
        taskId: taskId as unknown as number,
        workflowLogId,
        output: log.output,
        startedAt: log.startedAt,
        finishedAt: log.finishedAt,
        input: log.input,
        error: log.error,
      };
    });

    await this.taskService.createTaskLogs(taskLogs);

    await this.workflowService.finishWorkflowLog(
      workflowLogId,
      workflowLogStatus,
    );

    this.logger.debug('Finished process workflow');
  }
}
