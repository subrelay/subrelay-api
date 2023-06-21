import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropKeyColume1684904530759 implements MigrationInterface {
  name = 'DropKeyColume1684904530759';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "key"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "key" character varying NOT NULL DEFAULT "substring"((sha256(((gen_random_uuid())))), 2)`,
    );
  }
}
