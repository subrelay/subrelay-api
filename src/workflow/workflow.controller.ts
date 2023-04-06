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
import { filter, findIndex, isEmpty, orderBy } from 'lodash';
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
import { TriggerTaskConfig } from '../task/type/trigger.type';

@Controller('workflows')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly eventService: EventService,
    private readonly taskService: TaskService,
  ) {}

  @Get()
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
  async getWorkflow(@Param('id') id: string, @UserInfo() user: User) {
    const workflow = await this.workflowService.getWorkflow(id, user.id);

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
  async updateWorkflow(
    @Param('id') id: string,
    @Body() input: UpdateWorkflowRequest,
    @UserInfo() user: User,
  ) {
    if (!(await this.workflowService.workflowExists(id, user.id))) {
      throw new NotFoundException('Workflow not found');
    }

    await this.workflowService.updateWorkflow(id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteWorkflow(@Param('id') id: string, @UserInfo() user: User) {
    if (!(await this.workflowService.workflowExists(id, user.id))) {
      throw new NotFoundException('Workflow not found');
    }

    return this.workflowService.deleteWorkflow(id, user.id);
  }

  @Post()
  async createWorkflow(
    @Body() input: CreateWorkFlowRequest,
    @UserInfo() user: User,
  ) {
    input.tasks = this.modifyTaskRequests(input.tasks);
    await this.validateTasks(input.tasks);

    const workflow = await this.workflowService.createWorkflow(input, user.id);

    const tasks = await this.taskService.getTasks(workflow.id);

    return {
      ...workflow,
      tasks,
    };
  }

  private async validateTasks(tasks: CreateWorkflowTaskRequest[]) {
    const triggerTasks = filter(tasks, { type: TaskType.TRIGGER });
    if (isEmpty(triggerTasks)) {
      throw new BadRequestException('Can not found trigger task.');
    } else if (triggerTasks.length > 1) {
      throw new BadRequestException(
        'Should have only one trigger task in a workflow.',
      );
    }

    const triggerTaskConfig = new TriggerTaskConfig(triggerTasks[0].config);
    const event = await this.eventService.getEventById(
      triggerTaskConfig.eventId,
    );
    if (!event) {
      throw new BadRequestException('Event not found');
    }

    const missingDependingTaskNames = tasks
      .filter((t) => t.dependOnIndex === null && t.type !== TaskType.TRIGGER)
      .map((t) => t.name);
    if (!isEmpty(missingDependingTaskNames)) {
      throw new BadRequestException(
        `${missingDependingTaskNames.join(
          ', ',
        )} task(s) have to depend on another task.`,
      );
    }

    const invalidDependingTaskNames = tasks
      .filter((t) => t.dependOnIndex === -1)
      .map((t) => t.name);
    if (!isEmpty(invalidDependingTaskNames)) {
      throw new BadRequestException(
        `${invalidDependingTaskNames.join(
          ', ',
        )} task(s) depend on invalid task.`,
      );
    }
  }

  modifyTaskRequests(
    tasks: CreateWorkflowTaskRequest[],
  ): CreateWorkflowTaskRequest[] {
    return orderBy(
      tasks.map((task) => ({
        ...task,
        dependOnIndex: task.dependOnName
          ? findIndex(tasks, { name: task.dependOnName })
          : -2,
      })),
      ['dependOnIndex'],
      ['asc'],
    );
  }
}
