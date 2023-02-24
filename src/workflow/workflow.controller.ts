import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBasicAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { findIndex, get, orderBy } from 'lodash';
import { UserInfo } from '../common/user-info.decorator';
import { EventService } from '../event/event.service';
import { TaskType } from '../task/type/task.type';
import { User } from '../user/user.entity';
import {
  CreateWorkFlowRequest,
  CreateWorkflowTask,
  GetWorkflowsQueryParams,
  WorkflowsResponse,
  UpdateWorkFlowRequest,
  WorkflowDetail,
} from './workflow.dto';
import { WorkflowService } from './workflow.service';

@Controller('workflows')
@ApiTags('Workflow')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly eventService: EventService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'Return data if request is successful',
    type: WorkflowsResponse,
  })
  @ApiOperation({
    summary: 'Get all workflows',
  })
  @ApiBasicAuth()
  async getWorkflows(
    @Query() queryParams: GetWorkflowsQueryParams,
    @UserInfo() user: User,
  ): Promise<WorkflowsResponse> {
    return {
      workflows: await this.workflowService.getWorkflows(queryParams, user.id),
      total: await this.workflowService.getWorkflowsTotal(queryParams, user.id),
      limit: queryParams.limit,
      offset: queryParams.offset,
    };
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'Return data if request is successful',
    type: WorkflowDetail,
  })
  @ApiBasicAuth()
  @ApiOperation({
    summary: 'Get a workflow details',
  })
  async getWorkflow(
    @Param('id', ParseIntPipe) id: number,
    @UserInfo() user: User,
  ): Promise<WorkflowDetail> {
    const workflow = await this.workflowService.getWorkflow(id, user.id);

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    return workflow;
  }

  @Patch(':id')
  @HttpCode(204)
  @ApiBasicAuth()
  @ApiNoContentResponse({
    description: 'Return data if request is successful',
  })
  @ApiOperation({
    summary: 'Update a workflow',
  })
  async updateWorkflow(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: UpdateWorkFlowRequest,
    @UserInfo() user: User,
  ) {
    if (!(await this.workflowService.workflowExists(id, user.id))) {
      throw new NotFoundException('Workflow not found');
    }

    if (input.status) {
      await this.workflowService.updateWorkflowStatus(id, input.status);
    }
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiBasicAuth()
  @ApiNoContentResponse({
    description: 'Return data if request is successful',
  })
  @ApiOperation({
    summary: 'Delete a workflow',
  })
  async deleteWorkflow(
    @Param('id', ParseIntPipe) id: number,
    @UserInfo() user: User,
  ) {
    if (!(await this.workflowService.workflowExists(id, user.id))) {
      throw new NotFoundException('Workflow not found');
    }

    return this.workflowService.deleteWorkflow(id, user.id);
  }

  @Post()
  @ApiCreatedResponse({
    description: 'Return data if request is successful',
    type: WorkflowDetail,
  })
  @ApiOperation({
    summary: 'Create a workflow',
  })
  @ApiBasicAuth()
  async createWorkflow(
    @Body() input: CreateWorkFlowRequest,
    @UserInfo() user: User,
  ): Promise<WorkflowDetail> {
    input.tasks = orderBy(
      input.tasks.map((task) => ({
        ...task,
        dependOnIndex: findIndex(input.tasks, { name: task.dependOnName }),
      })),
      ['dependOnIndex'],
      ['asc'],
    );
    await this.validateTasks(input.chainUuid, input.tasks);

    const workflowId = await this.workflowService.createWorkflow(
      input,
      user.id,
    );

    return this.workflowService.getWorkflow(workflowId, user.id);
  }

  private async validateTasks(chainUuid: string, tasks: CreateWorkflowTask[]) {
    const triggerTask = tasks.find((t) => t.type === TaskType.TRIGGER);

    if (!triggerTask) {
      throw new BadRequestException('A workflow should has one trigger task');
    } else if (triggerTask.dependOnIndex !== -1) {
      throw new BadRequestException('Trigger task depends on invalid task');
    }

    const event = await this.eventService.getEventByChain(
      chainUuid,
      get(triggerTask, 'config.eventId'),
    );

    if (!event) {
      throw new BadRequestException('Event not found');
    }

    const otherTasks = tasks.filter((t) => t.type !== TaskType.TRIGGER);
    if (otherTasks.length === 0) {
      throw new BadRequestException(
        'A workflow should has at least one notification task',
      );
    } else if (otherTasks.some((task) => task.dependOnIndex === -1)) {
      throw new BadRequestException('Task depends on invalid task');
    }
  }
}
