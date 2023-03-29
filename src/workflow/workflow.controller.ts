import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
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
import { findIndex, orderBy } from 'lodash';
import { UserInfo } from '../common/user-info.decorator';
import { EventService } from '../event/event.service';
import { TaskService } from '../task/task.service';
import { TaskType } from '../task/type/task.type';
import { User } from '../user/user.entity';
import {
  CreateWorkFlowRequest,
  CreateWorkflowTaskRequest,
  GetWorkflowsQueryParams,
  UpdateWorkflowRequest,
} from './workflow.dto';
import { WorkflowService } from './workflow.service';

@Controller('workflows')
@ApiTags('Workflow')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly eventService: EventService,
    private readonly taskService: TaskService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'Return data if request is successful',
  })
  @ApiOperation({
    summary: 'Get all workflows',
  })
  @ApiBasicAuth()
  async getWorkflows(
    @Query() queryParams: GetWorkflowsQueryParams,
    @UserInfo() user: User,
  ) {
    const { workflows, total } =
      await this.workflowService.getWorkflowsAndTotal(queryParams, user.id);

    return {
      workflows,
      total,
      limit: queryParams.limit,
      offset: queryParams.offset,
    };
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'Return data if request is successful',
  })
  @ApiBasicAuth()
  @ApiOperation({
    summary: 'Get a workflow details',
  })
  async getWorkflow(@Param('id') id: string, @UserInfo() user: User) {
    const workflow = await this.workflowService.getWorkflowSummary(id, user.id);

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    const tasks = await this.taskService.getTasks(workflow.id);

    return {
      ...workflow,
      tasks,
    };
  }

  @Patch(':id')
  @HttpCode(204)
  @ApiBasicAuth()
  @ApiNoContentResponse()
  @ApiOperation({
    summary: 'Update a workflow',
  })
  async updateWorkflow(
    @Param('id') id: string,
    @Body() input: UpdateWorkflowRequest,
    @UserInfo() user: User,
  ) {
    if (!(await this.workflowService.workflowExists(id, user.id))) {
      throw new NotFoundException('Workflow not found');
    }

    await this.workflowService.updateWorkflowStatus(id, input);
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
  async deleteWorkflow(@Param('id') id: string, @UserInfo() user: User) {
    if (!(await this.workflowService.workflowExists(id, user.id))) {
      throw new NotFoundException('Workflow not found');
    }

    return this.workflowService.deleteWorkflow(id, user.id);
  }

  @Post()
  @ApiCreatedResponse({
    description: 'Return data if request is successful',
  })
  @ApiOperation({
    summary: 'Create a workflow',
  })
  @ApiBasicAuth()
  async createWorkflow(
    @Body() input: CreateWorkFlowRequest,
    @UserInfo() user: User,
  ) {
    input.tasks = orderBy(
      input.tasks.map((task) => ({
        ...task,
        dependOnIndex: findIndex(input.tasks, { name: task.dependOnName }),
      })),
      ['dependOnIndex'],
      ['asc'],
    );

    await this.validateTasks(input.eventId, input.tasks);

    const workflowId = await this.workflowService.createWorkflow(
      input,
      user.id,
    );

    const workflow = await this.workflowService.getWorkflowSummary(
      workflowId,
      user.id,
    );
    const tasks = await this.taskService.getTasks(workflow.id);

    return {
      ...workflow,
      tasks,
    };
  }

  private async validateTasks(
    eventId: string,
    tasks: CreateWorkflowTaskRequest[],
  ) {
    const event = await this.eventService.getEventById(eventId);

    if (!event) {
      throw new BadRequestException('Event not found');
    }

    const triggerTask = tasks.find((t) => t.type === TaskType.TRIGGER);

    if (!triggerTask) {
      throw new BadRequestException('A workflow should has one trigger task');
    } else if (triggerTask.dependOnIndex !== -1) {
      throw new BadRequestException('Trigger task depends on invalid task');
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
