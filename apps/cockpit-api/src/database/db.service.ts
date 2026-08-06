import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export interface DbExecutor {
  query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
}

@Injectable()
export class DbService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(configService: ConfigService) {
    this.pool = new Pool({
      connectionString: configService.get<string>('DATABASE_URL'),
      host: configService.get<string>('POSTGRES_HOST') ?? 'localhost',
      port: configService.get<number>('POSTGRES_PORT') ?? 5432,
      database: configService.get<string>('POSTGRES_DB') ?? 'vernietigingscockpit',
      user: configService.get<string>('POSTGRES_USER') ?? 'postgres',
      password: configService.get<string>('POSTGRES_PASSWORD') ?? 'postgres',
      max: configService.get<number>('POSTGRES_POOL_SIZE') ?? 10,
    });
  }

  query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
