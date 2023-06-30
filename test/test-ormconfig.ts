import { DataSource, DataSourceOptions } from 'typeorm';
import 'dotenv/config';
import { platform } from 'os';
import * as ip from 'ip';

function getHostName() {
  if (platform() === 'linux') {
    return 'localhost';
  }

  return ip.address();
}

export const cliOrmConfig: DataSourceOptions = {
  type: 'postgres',
  host: getHostName(),
  port: process.env.DB_PORT as any as number,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['./src/**/*.entity{.ts,.js}'],
  migrations: ['./src/migration/*.ts'],
};

const datasource = new DataSource(cliOrmConfig);

export default datasource;
