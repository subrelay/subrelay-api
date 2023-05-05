import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateIntegrationColumn1683254049360 implements MigrationInterface {
    name = 'UpdateIntegrationColumn1683254049360'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "key" SET DEFAULT substring(sha256(gen_random_uuid()::text::bytea)::text, 2)`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "integration" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "integration" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "key" SET DEFAULT "substring"((sha256(((gen_random_uuid())))), 2)`);
    }

}
