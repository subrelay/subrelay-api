import { MigrationInterface, QueryRunner } from 'typeorm';

export class addErrorColumnToTaskLogTable1679623996807
  implements MigrationInterface
{
  name = 'addErrorColumnToTaskLogTable1679623996807';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "task_log" ADD "error" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "task_log" DROP COLUMN "error"`);
  }
}
