import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Chain } from 'src/chain/chain.entity';
import { Pagination } from 'src/common/pagination.type';
import { Task } from 'src/task/entity/task.entity';
import { AbsConfig, ProcessStatus, TaskType } from 'src/task/type/task.type';
import { IsTaskConfig } from 'src/task/validator/task-config.validator';
import { Workflow } from './entity/workflow.entity';
import { WorkflowStatus } from './workflow.type';

export enum GetWorkflowsOrderBy {
  CREATEDAT = 'createdAt',
  UPDATEDAT = 'updatedAt',
  NAME = 'name',
}

export enum GetWorkflowLogsOrderBy {
  FINISHED_AT = 'finishedAt',
  CHAIN_NAME = 'chainName',
  NAME = 'name',
}

export class GetWorkflowsQueryParams extends Pagination {
  @ApiPropertyOptional({ example: '3342b0eb-ab4f-40c0-870c-6587de6b009a' })
  @IsString()
  @IsOptional()
  @IsUUID()
  chainUuid?: string;

  @ApiPropertyOptional({
    example: WorkflowStatus.RUNNING,
    enum: WorkflowStatus,
  })
  @IsEnum(WorkflowStatus, {
    message: `Invalid status. Possible values: ${Object.values(
      WorkflowStatus,
    ).join(', ')}`,
  })
  @IsOptional()
  status?: WorkflowStatus;

  @ApiPropertyOptional({
    example: GetWorkflowsOrderBy.NAME,
    enum: GetWorkflowsOrderBy,
  })
  @IsEnum(GetWorkflowsOrderBy, {
    message: `Invalid order. Possible values: ${Object.values(
      GetWorkflowsOrderBy,
    ).join(', ')}`,
  })
  order: GetWorkflowsOrderBy = GetWorkflowsOrderBy.NAME;
}

export class GetWorkflowLogsQueryParams extends Pagination {
  @ApiPropertyOptional({ example: '3342b0eb-ab4f-40c0-870c-6587de6b009a' })
  @IsString()
  @IsOptional()
  @IsUUID()
  chainUuid?: string;

  @ApiPropertyOptional({
    example: WorkflowStatus.RUNNING,
    enum: [ProcessStatus.FAILED, ProcessStatus.RUNNING],
  })
  @IsEnum(ProcessStatus, {
    message: `Invalid status. Possible values: ${ProcessStatus.FAILED}, ${ProcessStatus.SUCCESS}`,
  })
  @IsOptional()
  status?: ProcessStatus;

  @ApiPropertyOptional({
    example: GetWorkflowLogsOrderBy.FINISHED_AT,
    enum: GetWorkflowLogsOrderBy,
  })
  @IsEnum(GetWorkflowLogsOrderBy, {
    message: `Invalid order. Possible values: ${Object.values(
      GetWorkflowLogsOrderBy,
    ).join(', ')}`,
  })
  order: GetWorkflowLogsOrderBy = GetWorkflowLogsOrderBy.FINISHED_AT;
}

export class WorkflowDetail extends Workflow {
  @ApiProperty({
    type: Task,
    isArray: true,
    example: [
      {
        id: 1,
        name: 'Task1',
        config: [
          {
            eventId: 9,
            conditions: [
              {
                variable: 'data.amount',
                operator: 'greaterThan',
                value: 1,
              },
            ],
          },
        ],
        type: 'trigger',
        dependOn: null,
      },
      {
        id: 2,
        name: 'Notify webhook',
        type: 'notification',
        config: {
          channel: 'webhook',
          config: {
            headers: [],
            url: 'https://webhook.site/27307cdd-cca9-4389-8158-7742038fdc80',
          },
        },
        dependOn: 1,
      },
    ],
  })
  tasks: Task[];

  @ApiProperty({ example: '2022-11-18T00:53:30.082Z' })
  updatedAt?: string;

  @ApiProperty({ example: 'Workflow 1' })
  name: string;

  @ApiProperty({ example: '3342b0eb-ab4f-40c0-870c-6587de6b009a' })
  chainUuid: string;

  @ApiProperty({ example: 'Polkadot' })
  chainName: string;
}

export class WorkflowSummary extends Workflow {
  @ApiProperty({ example: '2022-11-18T00:53:30.082Z' })
  updatedAt?: string;

  @ApiProperty({
    example: { uuid: '3342b0eb-ab4f-40c0-870c-6587de6b009a', name: 'Polkadot' },
  })
  chain?: Chain;

  @ApiProperty({ example: 'Workflow 1' })
  name: string;

  @ApiProperty({ example: 2 })
  workflowVersionId: number;
}

export class WorkflowsResponse {
  @ApiProperty({ type: WorkflowSummary, isArray: true })
  workflows: WorkflowSummary[];

  @ApiProperty({ example: 1 })
  total: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 0 })
  offset: number;
}

export class WorkflowLogResponse {
  @ApiProperty({ example: 1 })
  id: number;
  @ApiProperty({ example: 'Workflow 1' })
  name: string;
  @ApiProperty({ example: '2022-11-18T00:52:30.082Z' })
  finishedAt: Date;
  @ApiProperty({ example: '2022-11-18T00:51:30.082Z' })
  startedAt: Date;
  @ApiProperty({
    example: { uuid: '3342b0eb-ab4f-40c0-870c-6587de6b009a', name: 'Polkadot' },
  })
  chain: {
    uuid: string;
    name: string;
  };
  @ApiProperty({ example: ProcessStatus.SUCCESS, enum: ProcessStatus })
  status: ProcessStatus;
}

export class CreateWorkFlowTask {
  @ApiProperty({ example: 'Task 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @ValidateNested()
  @IsTaskConfig()
  config: AbsConfig;

  @ApiProperty({
    enum: TaskType,
    example: TaskType.TRIGGER,
  })
  @IsEnum(TaskType, {
    message: `Invalid type. Possible values: ${Object.values(TaskType).join(
      ', ',
    )}`,
  })
  type: TaskType;

  @ApiPropertyOptional({ example: null })
  @IsOptional()
  @IsString()
  dependOnName?: string;

  dependOnIndex?: number;
}

export class GetWorkflowLogsResponse {
  @ApiProperty({ type: WorkflowLogResponse, isArray: true })
  workflowLogs: WorkflowLogResponse[];

  @ApiProperty({ example: 1 })
  total: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 0 })
  offset: number;
}

export class CreateWorkFlowRequest {
  @ApiProperty({ example: 'Workflow 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    type: CreateWorkFlowTask,
    isArray: true,
    example: [
      {
        name: 'Task1',
        config: [
          {
            eventId: 9,
            conditions: [
              {
                variable: 'data.amount',
                operator: 'greaterThan',
                value: 1,
              },
            ],
          },
        ],
        type: 'trigger',
        dependOnName: null,
      },
      {
        name: 'Notify webhook',
        type: 'notification',
        config: {
          channel: 'webhook',
          config: {
            headers: [],
            url: 'https://webhook.site/27307cdd-cca9-4389-8158-7742038fdc80',
          },
        },
        dependOnName: 'Task1',
      },
    ],
  })
  @IsArray()
  @ValidateNested()
  tasks: CreateWorkFlowTask[];

  @ApiProperty({
    example: '3342b0eb-ab4f-40c0-870c-6587de6b009a',
  })
  @IsUUID()
  chainUuid: string;
}

export class UpdateWorkFlowRequest {
  @ApiPropertyOptional({
    example: WorkflowStatus.RUNNING,
    enum: WorkflowStatus,
  })
  @IsEnum(WorkflowStatus, {
    message: `Invalid status. Possible values: ${Object.values(
      WorkflowStatus,
    ).join(', ')}`,
  })
  @IsOptional()
  status: WorkflowStatus;
}
