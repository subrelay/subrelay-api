export enum TaskStatus {
  FAILED,
  SUCCESS,
}

export class TaskOutput {
  status: TaskStatus;
  error?: {
    message: string;
  };
  output?: any;
}
