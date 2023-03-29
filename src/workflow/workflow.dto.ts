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
import { Pagination } from '../common/pagination.type';
import { TaskStatus, TaskType } from '../task/type/task.type';
import {
  WorkflowLogSummary,
  WorkflowStatus,
  WorkflowSummary,
} from './workflow.type';

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

  id?: number;
}

export class GetWorkflowLogsQueryParams extends Pagination {
  @ApiPropertyOptional({ example: '3342b0eb-ab4f-40c0-870c-6587de6b009a' })
  @IsString()
  @IsOptional()
  @IsUUID()
  chainUuid?: string;

  @ApiPropertyOptional({
    example: TaskStatus.SUCCESS,
    enum: [TaskStatus.FAILED, TaskStatus.SUCCESS],
  })
  @IsEnum(TaskStatus, {
    message: `Invalid status. Possible values: ${TaskStatus.FAILED}, ${TaskStatus.SUCCESS}`,
  })
  @IsOptional()
  status?: TaskStatus;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  workflowId?: number;

  @IsOptional()
  id?: number;

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

export class GetWorkflowsResponse {
  workflows: WorkflowSummary[];

  total: number;

  limit: number;

  offset: number;
}

export class CreateWorkflowTaskRequest {
  @ApiProperty({ example: 'Task 1' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  config: any;

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
  @ApiProperty()
  workflowLogs: WorkflowLogSummary[];

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
      {
        name: 'Notify email',
        type: 'notification',
        config: {
          channel: 'email',
          config: {
            addresses: ['example@gmail.com'],
            subjectTemplate: 'Your event has been triggered',
            contentTemplate:
              '${data.from} sent to ${data.to} ${data.amount} DOT',
            variables: ['data.from', 'data.to', 'data.amount'],
          },
        },
        dependOnName: 'Notify webhook',
      },
    ],
  })
  @IsArray()
  @ValidateNested()
  tasks: CreateWorkflowTaskRequest[];

  @ApiProperty({
    example: '3342b0eb-ab4f-40c0-870c-6587de6b009a',
  })
  @IsUUID()
  eventId: string;
}

export class UpdateWorkflowRequest {
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

  @ApiPropertyOptional({
    example: 'Updated workflow',
  })
  @IsOptional()
  name: string;
}
