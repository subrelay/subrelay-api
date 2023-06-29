import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { UserInfo } from '../common/user-info.decorator';
import { TaskService } from '../task/task.service';
import {
  GetWorkflowLogsQueryParams,
  GetWorkflowLogsResponse,
} from './workflow.dto';
import { WorkflowService } from './workflow.service';
import { UserSummary } from '../user/user.dto';
import { TaskLogEntity } from '../task/entity/task-log.entity';
import { find, findIndex, map } from 'lodash';

@Controller('workflow-logs')
export class WorkflowLogController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly taskService: TaskService,
  ) {}

  @Get()
  async getWorkflowLogs(
    @Query() queryParams: GetWorkflowLogsQueryParams,
    @UserInfo() user: UserSummary,
  ): Promise<GetWorkflowLogsResponse> {
    const { workflowLogs, total } =
      await await this.workflowService.getWorkflowLogsAndTotal(
        queryParams,
        user.id,
      );
    return {
      workflowLogs,
      total,
      limit: queryParams.limit,
      offset: queryParams.offset,
    };
  }

  @Get(':id')
  async getWorkflowLog(@Param('id') id: string, @UserInfo() user: UserSummary) {
    const workflowLog = await this.workflowService.getWorkflowLog(id, user.id);

    if (!workflowLog) {
      throw new NotFoundException('Workflow log not found');
    }

    const taskLogs = await this.taskService.getTaskLogs(id);

    return {
      ...workflowLog,
      taskLogs: this.orderTaskLogs(taskLogs),
    };
  }

  orderTaskLogs(logs: TaskLogEntity[]) {
    const tasks = map(logs, 'task');
    const order = tasks.map((task) => ({
      taskId: task.id,
      dependOnIndex: task.dependOn
        ? findIndex(tasks, { id: task.dependOn })
        : -2,
    }));

    return logs.sort((a, b) => {
      return (
        find(order, { taskId: a.task.id }).dependOnIndex -
        find(order, { taskId: b.task.id }).dependOnIndex
      );
    });
  }
}
