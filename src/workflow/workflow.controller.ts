import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { TaskType } from 'src/task/type/task.type';
import { Workflow } from './entity/workflow.entity';
import {
  CreateWorkFlowRequest,
  CreateWorkFlowTask,
  GetWorkflowsQueryParams,
  GetWorkflowsResponse,
} from './workflow.dto';
import { WorkflowService } from './workflow.service';

@Controller('workflows')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Get()
  async getWorkflows(
    @Query() queryParams: GetWorkflowsQueryParams,
  ): Promise<GetWorkflowsResponse> {
    const userId = 1;
    return {
      ...(await this.workflowService.getWorkflows(queryParams, userId)),
      limit: queryParams.limit,
      offset: queryParams.offset,
    };
  }

  @Get('/:id')
  async getWorkflow(@Param('id', ParseIntPipe) id: number): Promise<Workflow> {
    const userId = 1;
    const workflow = await this.workflowService.getWorkflow(id, userId);
    if (!workflow) {
      throw new NotFoundException();
    }

    return workflow;
  }

  @Post()
  async createWorkflow(
    @Body() input: CreateWorkFlowRequest,
  ): Promise<Workflow> {
    const userId = 1;
    this.validateTasks(input.tasks);
    return null;
  }

  private validateTasks(tasks: CreateWorkFlowTask[]) {
    const hasTriggerTask = tasks.some((t) => t.type === TaskType.TRIGGER);
    if (!hasTriggerTask) {
      throw new BadRequestException(
        'A workflow should has at least one trigger task',
      );
    }

    const hasNotificationTask = tasks.find(
      (t) => t.type === TaskType.NOTIFICATION,
    );
    if (!hasNotificationTask) {
      throw new BadRequestException(
        'A workflow should has at least one notification task',
      );
    }

    tasks.forEach((task) => {
      if (task.type !== TaskType.TRIGGER && !task.dependOnName) {
        throw new BadRequestException(
          `Task "${task.name}" must depend on another task`,
        );
      }

      if (task.type === TaskType.TRIGGER && task.dependOnName) {
        throw new BadRequestException(
          `A trigger task must not depend on another task`,
        );
      }

      if (task.dependOnName && task.name === task.dependOnName) {
        throw new BadRequestException(
          `Task "${task.name}" cannot depend on itself`,
        );
      }

      if (
        task.dependOnName &&
        tasks.some((t) => t.name === task.dependOnName)
      ) {
        throw new BadRequestException(
          `Task "${task.name}" depends on invalid task`,
        );
      }
    });
  }
}
