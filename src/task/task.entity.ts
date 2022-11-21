import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { TaskConfig, TaskType } from './type/task.type';

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, type: 'text' })
  type: TaskType;

  @Column({ nullable: false })
  name: string;

  @Column({ nullable: true, name: 'dependOn' })
  dependOn?: number;

  @Column({ nullable: false, type: 'jsonb' })
  config: TaskConfig;
}
