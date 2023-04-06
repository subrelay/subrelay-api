import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { UserInfo } from '../common/user-info.decorator';
import { TaskService } from '../task/task.service';
import { User } from '../user/user.entity';
import {
  GetWorkflowLogsQueryParams,
  GetWorkflowLogsResponse,
} from './workflow.dto';
import { WorkflowService } from './workflow.service';

@Controller('workflow-logs')
export class WorkflowLogController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly taskService: TaskService,
  ) {}

  @Get()
  async getWorkflowLogs(
    @Query() queryParams: GetWorkflowLogsQueryParams,
    @UserInfo() user: User,
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
  async getWorkflowLog(@Param('id') id: string, @UserInfo() user: User) {
    const workflowLog = await this.workflowService.getWorkflowLog(id, user.id);

    if (!workflowLog) {
      throw new NotFoundException('Workflow log not found');
    }

    const taskLogs = await this.taskService.getTaskLogs(id);

    return {
      ...workflowLog,
      taskLogs,
    };
  }
}
