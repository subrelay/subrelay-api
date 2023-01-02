import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTaskLogAndWorkflowLogTable1672651315100
  implements MigrationInterface
{
  name = 'createTaskLogAndWorkflowLogTable1672651315100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "chain"`);
    await queryRunner.query(
      `CREATE TABLE "workflow_log" ("id" SERIAL NOT NULL, "startedAt" TIMESTAMP NOT NULL DEFAULT now(), "finishedAt" TIMESTAMP WITH TIME ZONE, "status" text NOT NULL, "input" jsonb NOT NULL, "workflowVersionId" integer NOT NULL, CONSTRAINT "PK_1c557745d8d55b468018fbe4373" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "task_log" ("id" SERIAL NOT NULL, "startedAt" TIMESTAMP WITH TIME ZONE, "finishedAt" TIMESTAMP WITH TIME ZONE, "status" character varying NOT NULL, "workflowLogId" integer NOT NULL, "taskId" integer NOT NULL, "output" jsonb, CONSTRAINT "PK_0f80f57bb78387f37ef146434b8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_log" ADD CONSTRAINT "FK_ccc61aefc3ff1b0db88152c6fbc" FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_version"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
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
      `ALTER TABLE "workflow_log" DROP CONSTRAINT "FK_ccc61aefc3ff1b0db88152c6fbc"`,
    );
    await queryRunner.query(`DROP TABLE "task_log"`);
    await queryRunner.query(`DROP TABLE "workflow_log"`);
  }
}
