import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  OnModuleInit,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  filter,
  findIndex,
  groupBy,
  isEmpty,
  map,
  orderBy,
  some,
  toPairs,
  uniq,
} from 'lodash';
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
    input.tasks = this.modifyTaskRequests(input.tasks);
    await this.validateWorkflowTasks(
      await this.userService.getUserById(userInfo.id),
      input.tasks,
    );

    const workflow = await this.workflowService.createWorkflow(
      input,
      userInfo.id,
    );

    const tasks = await this.taskService.getTasks(workflow.id);

    return {
      ...workflow,
      tasks,
    };
  }

  private async validateWorkflowTasks(
    user: UserEntity,
    tasks: CreateWorkflowTaskRequest[],
  ) {
    if (tasks.length < 2) {
      throw new BadRequestException('Workflow should have at least 2 tasks.');
    }

    const taskNames = map(tasks, 'name');
    if (taskNames.length > uniq(taskNames).length) {
      throw new BadRequestException('Task names in a workflow should be uniq.');
    }

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

    tasks.forEach((task) => {
      validateTaskConfig(task.type, task.config);
    });

    toPairs(groupBy(tasks, 'dependOnIndex')).forEach(([, value]) => {
      if (value.length > 1) {
        throw new BadRequestException(
          `${map(value, 'name').join(
            ', ',
          )} task(s) are depend on the same task.`,
        );
      }
    });

    if (
      some(tasks, { type: TaskType.TELEGRAM }) &&
      !user?.integration?.telegram
    ) {
      throw new BadRequestException(
        "The integration with Telegram does't set up yet.",
      );
    }

    if (
      some(tasks, { type: TaskType.DISCORD }) &&
      !user?.integration?.discord
    ) {
      throw new BadRequestException(
        "The integration with Discord does't set up yet.",
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
