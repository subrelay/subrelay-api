import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBasicAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserInfo } from 'src/common/user-info.decorator';
import { User } from 'src/user/user.entity';
import {
  GetWorkflowLogsQueryParams,
  GetWorkflowLogsResponse,
} from './workflow.dto';
import { WorkflowService } from './workflow.service';

@Controller('workflow-logs')
@ApiTags('Workflow Log')
export class WorkflowLogController {
  constructor(private readonly workflowService: WorkflowService) {}

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
    console.log(queryParams);

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
}
