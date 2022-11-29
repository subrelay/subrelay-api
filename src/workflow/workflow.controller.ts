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
import { findIndex, orderBy } from 'lodash';
import { UserInfo } from 'src/common/user-info.decorator';
import { TaskType } from 'src/task/type/task.type';
import { User } from 'src/user/user.entity';
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
    @UserInfo() user: User,
  ): Promise<GetWorkflowsResponse> {
    return {
      ...(await this.workflowService.getWorkflows(queryParams, user.id)),
      limit: queryParams.limit,
      offset: queryParams.offset,
    };
  }

  @Get(':id')
  async getWorkflow(
    @Param('id', ParseIntPipe) id: number,
    @UserInfo() user: User,
  ): Promise<Workflow> {
    console.log(user);

    const workflow = await this.workflowService.getWorkflow(id, user.id);

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    return workflow;
  }

  @Patch(':id')
  @HttpCode(200)
  async updateWorkflow(
    @Param('id', ParseIntPipe) id: number,
    @Body() input: UpdateWorkFlowRequest,
    @UserInfo() user: User,
  ) {
    const workflow = await this.workflowService.getWorkflowSummary(id, user.id);

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    if (input.status) {
      await this.workflowService.updateWorkflowStatus(
        workflow.id,
        input.status,
      );
    }

    return this.workflowService.getWorkflowSummary(id, user.id);
  }

  @Delete(':id')
  @HttpCode(200)
  async deleteWorkflow(
    @Param('id', ParseIntPipe) id: number,
    @UserInfo() user: User,
  ) {
    const workflow = await this.workflowService.getWorkflowSummary(id, user.id);

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    return this.workflowService.deleteWorkflow(id, user.id);
  }

  @Post()
  async createWorkflow(
    @Body() input: CreateWorkFlowRequest,
    @UserInfo() user: User,
  ): Promise<Workflow> {
    input.tasks = orderBy(
      input.tasks.map((task) => ({
        ...task,
        dependOnIndex: findIndex(input.tasks, { name: task.dependOnName }),
      })),
      ['dependOnIndex'],
      ['asc'],
    );
    this.validateTasks(input.tasks);

    const workflowId = await this.workflowService.createWorkflow(
      input,
      user.id,
    );

    return this.workflowService.getWorkflow(workflowId, user.id);
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
