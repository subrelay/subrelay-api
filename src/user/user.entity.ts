import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @Column()
  address: string;
}
