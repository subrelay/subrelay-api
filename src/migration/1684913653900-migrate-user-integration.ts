import { MigrationInterface, QueryRunner } from 'typeorm';

export class migrateUserIntegration1684913653900 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "user" SET integration = NULL`);
  }

  public async down(): Promise<void> {
    // Do nothing
  }
}
