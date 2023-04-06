import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Pagination } from '../common/pagination.type';
import { TaskStatus, TaskType } from '../task/type/task.type';
import { Workflow, WorkflowLogSummary, WorkflowStatus } from './workflow.type';

export enum GetWorkflowsOrderBy {
  CREATEDAT = 'createdAt',
  UPDATEDAT = 'updatedAt',
  NAME = 'name',
}

export enum GetWorkflowLogsOrderBy {
  FINISHED_AT = 'finishedAt',
  STARTED_AT = 'startedAt',
  NAME = 'name',
}

export class GetWorkflowsQueryParams extends Pagination {
  @IsString()
  @IsOptional()
  chainUuid?: string;

  @IsEnum(WorkflowStatus, {
    message: `Invalid status. Possible values: ${Object.values(
      WorkflowStatus,
    ).join(', ')}`,
  })
  @IsOptional()
  status?: WorkflowStatus;

  @IsEnum(GetWorkflowsOrderBy, {
    message: `Invalid order. Possible values: ${Object.values(
      GetWorkflowsOrderBy,
    ).join(', ')}`,
  })
  order: GetWorkflowsOrderBy = GetWorkflowsOrderBy.NAME;

  id?: number;
}

export class GetWorkflowLogsQueryParams extends Pagination {
  @IsString()
  @IsOptional()
  chainUuid?: string;

  @IsEnum(TaskStatus, {
    message: `Invalid status. Possible values: ${TaskStatus.FAILED}, ${TaskStatus.SUCCESS}`,
  })
  @IsOptional()
  status?: TaskStatus;

  @IsOptional()
  workflowId?: number;

  @IsOptional()
  id?: number;

  @IsEnum(GetWorkflowLogsOrderBy, {
    message: `Invalid order. Possible values: ${Object.values(
      GetWorkflowLogsOrderBy,
    ).join(', ')}`,
  })
  order: GetWorkflowLogsOrderBy = GetWorkflowLogsOrderBy.FINISHED_AT;
}

export class GetWorkflowsResponse {
  workflows: Workflow[];

  total: number;

  limit: number;

  offset: number;
}

export class CreateWorkflowTaskRequest {
  @IsString()
  @IsNotEmpty()
  name: string;

  config: any;

  @IsEnum(TaskType, {
    message: `Invalid type. Possible values: ${Object.values(TaskType).join(
      ', ',
    )}`,
  })
  type: TaskType;

  @IsOptional()
  @IsString()
  dependOnName?: string;

  dependOnIndex?: number;
}

export class GetWorkflowLogsResponse {
  workflowLogs: WorkflowLogSummary[];

  total: number;

  limit: number;

  offset: number;
}

export class CreateWorkFlowRequest {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested()
  tasks: CreateWorkflowTaskRequest[];
}

export class UpdateWorkflowRequest {
  @IsEnum(WorkflowStatus, {
    message: `Invalid status. Possible values: ${Object.values(
      WorkflowStatus,
    ).join(', ')}`,
  })
  @IsOptional()
  status: WorkflowStatus;

  @IsOptional()
  name: string;
}
