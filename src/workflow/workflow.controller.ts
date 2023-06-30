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
import { findIndex, groupBy, orderBy } from 'lodash';
import { UserInfo } from '../common/user-info.decorator';
import { EventService } from '../event/event.service';
import { TaskService } from '../task/task.service';
import { TaskType, validateTaskConfig } from '../task/type/task.type';
import { UserEntity } from '../user/user.entity';
import {
  CreateWorkFlowRequest,
  CreateWorkflowTaskRequest,
  GetWorkflowsQueryParams,
  UpdateWorkflowRequest,
  WorkflowTaskInput,
} from './workflow.dto';
import { WorkflowService } from './workflow.service';
import { TriggerTaskConfig } from '../task/type/trigger.type';
import { UserSummary } from '../user/user.dto';
import { UserService } from '../user/user.service';

@Controller('workflows')
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly eventService: EventService,
    private readonly taskService: TaskService,
    private readonly userService: UserService,
  ) {}

  @Get()
  async getWorkflows(
    @Query() queryParams: GetWorkflowsQueryParams,
    @UserInfo() user: UserSummary,
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
  async getWorkflow(@Param('id') id: string, @UserInfo() user: UserSummary) {
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
    @UserInfo() user: UserSummary,
  ) {
    if (!(await this.workflowService.workflowExists(id, user.id))) {
      throw new NotFoundException('Workflow not found');
    }

    await this.workflowService.updateWorkflow(id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteWorkflow(@Param('id') id: string, @UserInfo() user: UserSummary) {
    if (!(await this.workflowService.workflowExists(id, user.id))) {
      throw new NotFoundException('Workflow not found');
    }

    return this.workflowService.deleteWorkflow(id, user.id);
  }

  @Post()
  async createWorkflow(
    @Body() input: CreateWorkFlowRequest,
    @UserInfo() userInfo: UserSummary,
  ) {
    const taskInputs = this.modifyTaskRequests(input.tasks);
    await this.validateWorkflowTasks(
      await this.userService.getUserById(userInfo.id),
      taskInputs,
    );

    const workflow = await this.workflowService.createWorkflow(
      input.name,
      taskInputs,
      userInfo.id,
    );

    const tasks = await this.taskService.getTasks(workflow.id);

    return {
      ...workflow,
      tasks,
    };
  }

  async validateWorkflowTasks(user: UserEntity, tasks: WorkflowTaskInput[]) {
    this.validateTaskCount(tasks);
    this.validateTaskNames(tasks);
    this.validateTriggerTask(tasks);

    const triggerTaskConfig = this.getTriggerTaskConfig(tasks);
    await this.validateEvent(triggerTaskConfig.eventId);

    this.validateDependingTasks(tasks);
    this.validateTaskConfigs(tasks);
    this.validateDuplicateDependingTasks(tasks);

    this.validateIntegration(user, tasks, TaskType.TELEGRAM);
    this.validateIntegration(user, tasks, TaskType.DISCORD);
  }

  validateTaskCount(tasks: WorkflowTaskInput[]) {
    if (tasks.length < 2) {
      throw new BadRequestException('Workflow should have at least 2 tasks.');
    }
  }

  validateTaskNames(tasks: WorkflowTaskInput[]) {
    const taskNames = tasks.map((task) => task.name);
    const uniqueTaskNames = [...new Set(taskNames)];
    if (taskNames.length !== uniqueTaskNames.length) {
      throw new BadRequestException(
        'Task names in a workflow should be unique.',
      );
    }
  }

  validateTriggerTask(tasks: WorkflowTaskInput[]) {
    const triggerTasks = tasks.filter((task) => task.type === TaskType.TRIGGER);
    if (triggerTasks.length !== 1) {
      throw new BadRequestException(
        'Should have only one trigger task in a workflow.',
      );
    }
  }

  getTriggerTaskConfig(tasks: WorkflowTaskInput[]) {
    const triggerTask = tasks.find((task) => task.type === TaskType.TRIGGER);
    if (!triggerTask) {
      throw new BadRequestException('Can not find trigger task.');
    }
    return new TriggerTaskConfig(triggerTask.config);
  }

  async validateEvent(eventId: string) {
    const event = await this.eventService.getEventById(eventId);
    if (!event) {
      throw new BadRequestException('Event not found');
    }
  }

  validateDependingTasks(tasks: WorkflowTaskInput[]) {
    const missingDependingTaskNames = tasks
      .filter(
        (task) => task.dependOnIndex === null && task.type !== TaskType.TRIGGER,
      )
      .map((task) => task.name);
    if (missingDependingTaskNames.length > 0) {
      throw new BadRequestException(
        `${missingDependingTaskNames.join(
          ', ',
        )} task(s) have to depend on another task.`,
      );
    }

    const invalidDependingTaskNames = tasks
      .filter((task) => task.dependOnIndex === -1)
      .map((task) => task.name);
    if (invalidDependingTaskNames.length > 0) {
      throw new BadRequestException(
        `${invalidDependingTaskNames.join(
          ', ',
        )} task(s) depend on an invalid task.`,
      );
    }
  }

  validateTaskConfigs(tasks: WorkflowTaskInput[]) {
    tasks.forEach((task) => {
      validateTaskConfig(task.type, task.config);
    });
  }

  validateDuplicateDependingTasks(tasks: WorkflowTaskInput[]) {
    const groupedTasks = groupBy(tasks, 'dependOnIndex');
    Object.values(groupedTasks).forEach((tasksWithSameDependOnIndex) => {
      if (tasksWithSameDependOnIndex.length > 1) {
        const taskNames = tasksWithSameDependOnIndex.map((task) => task.name);
        throw new BadRequestException(
          `${taskNames.join(', ')} task(s) are depend on the same task.`,
        );
      }
    });
  }

  validateIntegration(
    user: UserEntity,
    tasks: WorkflowTaskInput[],
    taskType: TaskType.TELEGRAM | TaskType.DISCORD,
  ) {
    if (
      tasks.some((task) => task.type === taskType) &&
      !user?.integration?.[taskType.toString()]
    ) {
      throw new BadRequestException(
        `The integration with ${taskType.toString()} doesn't set up yet.`,
      );
    }
  }

  modifyTaskRequests(tasks: CreateWorkflowTaskRequest[]): WorkflowTaskInput[] {
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
