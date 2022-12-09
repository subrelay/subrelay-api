import { MigrationInterface, QueryRunner } from "typeorm";

export class createBlockDataTable1669706357229 implements MigrationInterface {
    name = 'createBlockDataTable1669706357229'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "block_data" ("id" SERIAL NOT NULL, "timestamp" integer NOT NULL, "hash" text NOT NULL, "chainUuid" uuid NOT NULL, "eventDatas" jsonb NOT NULL, CONSTRAINT "PK_670f14b4f7c6f96bcf5c01fe29d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "block_data" ADD CONSTRAINT "FK_ee9cdcd0370f4d23c28f5f80fd9" FOREIGN KEY ("chainUuid") REFERENCES "chain"("uuid") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "block_data" DROP CONSTRAINT "FK_ee9cdcd0370f4d23c28f5f80fd9"`);
        await queryRunner.query(`DROP TABLE "block_data"`);
    }

}
