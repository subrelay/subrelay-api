import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { findIndex, orderBy } from 'lodash';
import { TaskType } from 'src/task/type/task.type';
import { Workflow } from './entity/workflow.entity';
import {
  CreateWorkFlowRequest,
  CreateWorkFlowTask,
  GetWorkflowsQueryParams,
  GetWorkflowsResponse,
  UpdateWorkFlowRequest,
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

  @Get(':id')
  async getWorkflow(@Param('id', ParseIntPipe) id: number): Promise<Workflow> {
    const userId = 1;
    const workflow = await this.workflowService.getWorkflow(id, userId);

    console.log({ workflow });

    if (!workflow) {
      throw new NotFoundException();
    }

    return workflow;
  }

  @Patch(':id')
  @HttpCode(200)
  async updateWorkflow(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: UpdateWorkFlowRequest,
  ) {
    const userId = 1;
    const workflow = await this.workflowService.getWorkflowSummary(id, userId);

    if (!workflow) {
      throw new NotFoundException();
    }

    if (input.status) {
      await this.workflowService.updateWorkflowStatus(
        workflow.id,
        input.status,
      );
    }
  }

  @Post()
  async createWorkflow(
    @Body() input: CreateWorkFlowRequest,
  ): Promise<Workflow> {
    const userId = 1;
    input.tasks = orderBy(
      input.tasks.map((task) => ({
        ...task,
        dependOnIndex: findIndex(input.tasks, { name: task.dependOnName }),
      })),
      ['dependOnIndex'],
      ['asc'],
    );
    this.validateTasks(input.tasks);

    const workflowId = await this.workflowService.createWorkflow(input, userId);

    return this.workflowService.getWorkflow(workflowId, userId);
  }

  private validateTasks(tasks: CreateWorkFlowTask[]) {
    const triggerTasks = tasks.filter((t) => t.type === TaskType.TRIGGER);

    if (triggerTasks.length !== 1) {
      throw new BadRequestException('A workflow should has one trigger task');
    } else if (triggerTasks[0].dependOnIndex !== -1) {
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
