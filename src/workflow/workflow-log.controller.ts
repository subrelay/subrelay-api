import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiBasicAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ChainService } from '../chain/chain.service';
import { UserInfo } from '../common/user-info.decorator';
import { TaskService } from '../task/task.service';
import { User } from '../user/user.entity';
import {
  GetWorkflowLogsQueryParams,
  GetWorkflowLogsResponse,
  WorkflowLogDetail,
} from './workflow.dto';
import { WorkflowService } from './workflow.service';

@Controller('workflow-logs')
@ApiTags('Workflow Log')
export class WorkflowLogController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly taskService: TaskService,
    private readonly chainService: ChainService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'Return data if request is successful',
    type: GetWorkflowLogsResponse,
  })
  @ApiOperation({
    summary: 'Get all workflow logs',
  })
  @ApiBasicAuth()
  async getWorkflowLogs(
    @Query() queryParams: GetWorkflowLogsQueryParams,
    @UserInfo() user: User,
  ): Promise<GetWorkflowLogsResponse> {
    return {
      workflowLogs: await this.workflowService.getWorkflowLogs(
        queryParams,
        user.id,
      ),
      total: await this.workflowService.getWorkflowLogsTotal(
        queryParams,
        user.id,
      ),
      limit: queryParams.limit,
      offset: queryParams.offset,
    };
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'Return data if request is successful',
    type: WorkflowLogDetail,
  })
  @ApiOperation({
    summary: 'Get a workflow log',
  })
  @ApiBasicAuth()
  async getWorkflowLog(
    @Param('id', ParseIntPipe) id: number,
    @UserInfo() user: User,
  ): Promise<WorkflowLogDetail> {
    const workflowLog = await this.workflowService.getWorkflowLog(id, user.id);

    if (!workflowLog) {
      throw new NotFoundException('Workflow log not found');
    }

    const taskLogs = await this.taskService.getTaskLogs(id);
    return {
      ...workflowLog,
      taskLogs: taskLogs.map((log) => ({ ...log, input: workflowLog.input })),
    };
  }
}
