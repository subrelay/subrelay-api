import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { isEmpty, map } from 'lodash';
import { WorkflowJobData } from '../common/queue.type';
import { TaskService } from '../task/task.service';
import { BaseTask, ProcessStatus } from '../task/type/task.type';
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
    const { event, eventData, workflowVersionId }: WorkflowJobData = job.data;
    this.logger.debug(
      `Process event "${event.name}" for workflow version ${workflowVersionId}`,
    );

    const tasks = await this.taskService.getTasks(workflowVersionId);
    const schema = {};
    tasks.forEach((task) => {
      schema[task.dependOn || 0] = new BaseTask(task);
    });

    const workflow = await this.workflowService.getWorkflowSummaryByVersionId(
      workflowVersionId,
    );
    const workflowResult = await this.workflowService.processWorkflow(
      0,
      { eventInfo: event, eventData, workflow },
      schema,
      {},
    );

    if (isEmpty(workflowResult)) {
      this.logger.debug(`Event not match!`);
      return;
    }

    let workflowLogStatus = ProcessStatus.SUCCESS;
    const workflowLogId = await this.workflowService.createWorkflowLog({
      input: eventData,
      workflowVersionId: workflowVersionId,
    });
    const taskLogs = map(workflowResult, (log, taskId) => {
      if (!log.output.success) {
        workflowLogStatus = ProcessStatus.FAILED;
      }

      return {
        status: log.output.success
          ? ProcessStatus.SUCCESS
          : ProcessStatus.FAILED,
        taskId: taskId as unknown as number,
        workflowLogId,
        output: log.output,
        startedAt: log.startedAt,
        finishedAt: log.finishedAt,
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
