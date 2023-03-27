import { MigrationInterface, QueryRunner } from 'typeorm';

export class addInputColumnToTaskLogTable1679585554665
  implements MigrationInterface
{
  name = 'addInputColumnToTaskLogTable1679585554665';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "task_log" ADD "input" jsonb`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "task_log" DROP COLUMN "input"`);
  }
}
