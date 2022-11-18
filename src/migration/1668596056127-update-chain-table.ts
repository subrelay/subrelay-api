import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateChainTable1668596056127 implements MigrationInterface {
  name = 'updateChainTable1668596056127';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chain" DROP COLUMN "chain_id"`);
    await queryRunner.query(`ALTER TABLE "chain" DROP COLUMN "created_at"`);
    await queryRunner.query(`ALTER TABLE "chain" DROP COLUMN "image_url"`);
    await queryRunner.query(
      `ALTER TABLE "chain" ADD "chainId" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "chain" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "chain" ADD "imageUrl" character varying NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chain" DROP COLUMN "imageUrl"`);
    await queryRunner.query(`ALTER TABLE "chain" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "chain" DROP COLUMN "chainId"`);
    await queryRunner.query(
      `ALTER TABLE "chain" ADD "image_url" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "chain" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "chain" ADD "chain_id" character varying NOT NULL`,
    );
  }
}
