import { DataSourceOptions } from 'typeorm';
import 'dotenv/config';

const config: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT as any as number,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['./src/**/*.entity{.ts,.js}'],
  migrations: ['./src/migration/*.ts'],
};

export default config;
