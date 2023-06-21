import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitDatabase1682588298146 implements MigrationInterface {
  name = 'InitDatabase1682588298146';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "chain" ("uuid" character(26) NOT NULL, "chainId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "version" character varying NOT NULL, "name" character varying NOT NULL, "imageUrl" character varying NOT NULL, "config" jsonb NOT NULL, CONSTRAINT "PK_5f84c3d40052cb2dc82e7232705" PRIMARY KEY ("uuid"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "event" ("id" character(26) NOT NULL, "name" character varying NOT NULL, "schema" jsonb NOT NULL, "description" character varying, "index" integer NOT NULL, "chainUuid" character(26) NOT NULL, CONSTRAINT "PK_30c2f3bbaf6d34a55f8ae6e4614" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" character(26) NOT NULL, "address" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "key" character varying NOT NULL DEFAULT substring(sha256(gen_random_uuid()::text::bytea)::text, 2), "integration" jsonb NOT NULL, CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow" ("id" character(26) NOT NULL, "status" text NOT NULL, "name" text NOT NULL, "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character(26) NOT NULL, "eventId" character(26) NOT NULL, CONSTRAINT "PK_eb5e4cc1a9ef2e94805b676751b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_log" ("id" character(26) NOT NULL, "startedAt" TIMESTAMP NOT NULL DEFAULT now(), "finishedAt" TIMESTAMP WITH TIME ZONE, "status" text NOT NULL, "input" jsonb NOT NULL, "workflowId" character(26) NOT NULL, CONSTRAINT "PK_1c557745d8d55b468018fbe4373" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "task" ("id" character(26) NOT NULL, "type" text NOT NULL, "name" character varying NOT NULL, "dependOn" character(26), "config" jsonb NOT NULL, "workflowId" character(26) NOT NULL, CONSTRAINT "PK_fb213f79ee45060ba925ecd576e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "task_log" ("id" character(26) NOT NULL, "startedAt" TIMESTAMP WITH TIME ZONE, "finishedAt" TIMESTAMP WITH TIME ZONE, "status" character varying NOT NULL, "workflowLogId" character(26) NOT NULL, "taskId" character(26) NOT NULL, "output" jsonb, "input" jsonb, "error" jsonb, CONSTRAINT "PK_0f80f57bb78387f37ef146434b8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "event" ADD CONSTRAINT "FK_8d4d71508ff1be5995770183a2c" FOREIGN KEY ("chainUuid") REFERENCES "chain"("uuid") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow" ADD CONSTRAINT "FK_5c43d4a3144b7c40bcfd7071440" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow" ADD CONSTRAINT "FK_ae658743efabae2b30b5ccacd22" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_log" ADD CONSTRAINT "FK_00f8f9b900fbe75d14169a75f29" FOREIGN KEY ("workflowId") REFERENCES "workflow"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task" ADD CONSTRAINT "FK_4a7490675dae23159db22ddc216" FOREIGN KEY ("workflowId") REFERENCES "workflow"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_log" ADD CONSTRAINT "FK_a55859e7c08754714147a85c270" FOREIGN KEY ("workflowLogId") REFERENCES "workflow_log"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_log" ADD CONSTRAINT "FK_1142dfec452e924b346f060fdaa" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task_log" DROP CONSTRAINT "FK_1142dfec452e924b346f060fdaa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task_log" DROP CONSTRAINT "FK_a55859e7c08754714147a85c270"`,
    );
    await queryRunner.query(
      `ALTER TABLE "task" DROP CONSTRAINT "FK_4a7490675dae23159db22ddc216"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_log" DROP CONSTRAINT "FK_00f8f9b900fbe75d14169a75f29"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow" DROP CONSTRAINT "FK_ae658743efabae2b30b5ccacd22"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow" DROP CONSTRAINT "FK_5c43d4a3144b7c40bcfd7071440"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event" DROP CONSTRAINT "FK_8d4d71508ff1be5995770183a2c"`,
    );
    await queryRunner.query(`DROP TABLE "task_log"`);
    await queryRunner.query(`DROP TABLE "task"`);
    await queryRunner.query(`DROP TABLE "workflow_log"`);
    await queryRunner.query(`DROP TABLE "workflow"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TABLE "event"`);
    await queryRunner.query(`DROP TABLE "chain"`);
  }
}
