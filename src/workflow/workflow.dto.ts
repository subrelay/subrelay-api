import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Pagination } from 'src/common/pagination.type';
import { AbsConfig, TaskType } from 'src/task/type/task.type';
import { IsTaskConfig } from 'src/task/validator/task-config.validator';
import { Workflow } from './entity/workflow.entity';
import { WorkflowStatus } from './workflow.type';

export enum GetWorkflowsOrderBy {
  CREATEDAT = 'createdAt',
  UPDATEDAT = 'updatedAt',
  NAME = 'name',
}

export class GetWorkflowsQueryParams extends Pagination {
  @IsString()
  @IsOptional()
  @IsUUID()
  chainUuid?: String;

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
}

export class GetWorkflowsResponse {
  workflows: Workflow[];
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
  tasks: CreateWorkFlowTask[];

  @IsUUID()
  chainUuid: string;
}

export class UpdateWorkFlowRequest {
  @IsEnum(WorkflowStatus, {
    message: `Invalid status. Possible values: ${Object.values(
      WorkflowStatus,
    ).join(', ')}`,
  })
  @IsOptional()
  status: WorkflowStatus;
}

export class CreateWorkFlowTask {
  @IsString()
  @IsNotEmpty()
  name: string;

  @ValidateNested()
  @IsTaskConfig()
  config: AbsConfig;

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
