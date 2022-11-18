import { MigrationInterface, QueryRunner } from 'typeorm';

export class createChainTable1668411860353 implements MigrationInterface {
  name = 'createChainTable1668411860353';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "chain" ("uuid" uuid NOT NULL DEFAULT uuid_generate_v4(), "chain_id" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "version" character varying NOT NULL, "name" character varying NOT NULL, "image_url" character varying NOT NULL, "config" jsonb NOT NULL, CONSTRAINT "PK_5f84c3d40052cb2dc82e7232705" PRIMARY KEY ("uuid"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "chain"`);
  }
}
