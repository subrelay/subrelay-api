import { MigrationInterface, QueryRunner } from 'typeorm';

export class createWorkflowAndTaskTable1669367101318
  implements MigrationInterface
{
  name = 'createWorkflowAndTaskTable1669367101318';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "workflow" ("id" SERIAL NOT NULL, "status" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" integer NOT NULL, CONSTRAINT "PK_eb5e4cc1a9ef2e94805b676751b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_version" ("id" SERIAL NOT NULL, "name" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "workflowId" integer NOT NULL, "chainUuid" uuid NOT NULL, CONSTRAINT "PK_e61d12662fd18f475bba2e86b7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "task" ("id" SERIAL NOT NULL, "type" text NOT NULL, "name" character varying NOT NULL, "dependOn" integer, "config" jsonb NOT NULL, "workflowVersionId" integer NOT NULL, CONSTRAINT "PK_fb213f79ee45060ba925ecd576e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow" ADD CONSTRAINT "FK_5c43d4a3144b7c40bcfd7071440" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_version" ADD CONSTRAINT "FK_b00b2f4dd6f51c2997a35f3b267" FOREIGN KEY ("workflowId") REFERENCES "workflow"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_version" ADD CONSTRAINT "FK_83e381d190084b9ece0ef8920d7" FOREIGN KEY ("chainUuid") REFERENCES "chain"("uuid") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "task" ADD CONSTRAINT "FK_1a42be37d185c53e65e0ea481b7" FOREIGN KEY ("workflowVersionId") REFERENCES "workflow_version"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "task" DROP CONSTRAINT "FK_1a42be37d185c53e65e0ea481b7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_version" DROP CONSTRAINT "FK_83e381d190084b9ece0ef8920d7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow_version" DROP CONSTRAINT "FK_b00b2f4dd6f51c2997a35f3b267"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workflow" DROP CONSTRAINT "FK_5c43d4a3144b7c40bcfd7071440"`,
    );
    await queryRunner.query(`DROP TABLE "task"`);
    await queryRunner.query(`DROP TABLE "workflow_version"`);
    await queryRunner.query(`DROP TABLE "workflow"`);
  }
}
