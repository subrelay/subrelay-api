import { MigrationInterface, QueryRunner } from 'typeorm';

export class createEventTable1668757382309 implements MigrationInterface {
  name = 'createEventTable1668757382309';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "event" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "pallet" character varying NOT NULL, "dataSchema" jsonb NOT NULL, "description" character varying, "index" integer NOT NULL, "chainUuid" uuid NOT NULL, CONSTRAINT "PK_30c2f3bbaf6d34a55f8ae6e4614" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "event" ADD CONSTRAINT "FK_8d4d71508ff1be5995770183a2c" FOREIGN KEY ("chainUuid") REFERENCES "chain"("uuid") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "event" DROP CONSTRAINT "FK_8d4d71508ff1be5995770183a2c"`,
    );
    await queryRunner.query(`DROP TABLE "event"`);
  }
}
