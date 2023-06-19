import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { find, map } from 'lodash';
import { TaskService } from '../task/task.service';
import { BaseTask, TaskStatus, TaskType } from '../task/type/task.type';
import { WorkflowService } from '../workflow/workflow.service';
import { ulid } from 'ulid';
import { ProcessWorkflowInput } from '../workflow/workflow.type';
import { UserService } from '../user/user.service';

@Processor('workflow')
export class WorkflowProcessor {
  private readonly logger = new Logger(WorkflowProcessor.name);
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly taskService: TaskService,
  ) {}

  @Process({ concurrency: 10 })
  async processWorkflowJob(job: Job) {
    const input: ProcessWorkflowInput = job.data;
    this.logger.debug(
      `Process event "${input.event.name}" for workflow version ${input.workflow.id} xxxx`,
    );
    const tasks = await this.taskService.getTasks(input.workflow.id, false);

    const schema: { [key: string]: BaseTask } = {};
    tasks.forEach((task) => {
      schema[task.dependOn || 'start'] = new BaseTask(task);
    });

    const workflowResult = await this.workflowService.processWorkflow(
      input,
      schema,
    );

    const filterTask = find(tasks, { type: TaskType.FILTER });

    try {
      if (
        filterTask &&
        workflowResult[filterTask.id].status === TaskStatus.SUCCESS &&
        workflowResult[filterTask.id]?.output?.match === false
      ) {
        this.logger.debug(`Event not match!`);
        return;
      }

      let workflowLogStatus = TaskStatus.SUCCESS;
      const workflowLogId = await this.workflowService.createWorkflowLog({
        input: input.event.data,
        workflowId: input.workflow.id,
      });

      const taskLogs = map(schema, (task) => {
        const log = workflowResult[task.id];
        const status = log ? log.status : TaskStatus.SKIPPED;
        if (log) {
          workflowLogStatus = log.status;
        }

        return {
          id: ulid(),
          status: status,
          taskId: task.id,
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

      this.logger.debug('[Workflow] Finished process workflow');
    } catch (error) {
      this.logger.error('[Workflow] Failed to process workflow', error);
    }
  }
}
