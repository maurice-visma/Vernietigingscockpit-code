import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { QueryResult, QueryResultRow } from 'pg';
import { DbExecutor, DbService } from '../../database/db.service';
import { WorkflowService } from './workflow.service';

type QueryCall = {
  sql: string;
  params: unknown[];
};

class FakeExecutor implements DbExecutor {
  readonly calls: QueryCall[] = [];

  constructor(private status?: string) {}

  async query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
    this.calls.push({ sql, params });

    if (sql.includes('FOR UPDATE')) {
      return this.result(
        this.status
          ? [
              {
                taakId: 'taak-1',
                taakuitvoeringId: 'uitvoering-1',
                status: this.status,
                huidigeStap: 'Huidige stap',
                bijgewerktOp: new Date('2026-08-06T10:00:00.000Z'),
              },
            ]
          : [],
      );
    }

    if (sql.includes('UPDATE taakuitvoeringen')) {
      this.status = params[2] as string;
      return this.result([
          {
            taakId: 'taak-1',
            taakuitvoeringId: 'uitvoering-1',
            status: params[2],
            huidigeStap: params[3],
            bijgewerktOp: new Date('2026-08-06T10:01:00.000Z'),
          },
        ]);
    }

    return this.result([]);
  }

  private result<T extends QueryResultRow = QueryResultRow>(rows: Record<string, unknown>[]): QueryResult<T> {
    return {
      rows: rows as T[],
      command: 'SELECT',
      rowCount: rows.length,
      oid: 0,
      fields: [],
    };
  }
}

describe('WorkflowService', () => {
  const gebruiker = {
    id: 'user-1',
    naam: 'Testgebruiker',
    rollen: ['proceseigenaar'],
  };

  it('past een toegestane transitie toe en schrijft auditcontext', async () => {
    const executor = new FakeExecutor('wacht_op_proceseigenaar');
    const service = new WorkflowService({} as DbService);

    const result = await service.transition(
      { taakId: 'taak-1', taakuitvoeringId: 'uitvoering-1' },
      'wacht_op_archivaris',
      gebruiker,
      'accordering.proceseigenaar.akkoord',
      { accorderingId: 'acc-1' },
      executor,
    );

    expect(result.status).toBe('wacht_op_archivaris');
    expect(result.vorigeStatus).toBe('wacht_op_proceseigenaar');
    expect(executor.calls.some((call) => call.sql.includes('INSERT INTO audit_events'))).toBe(true);

    const auditCall = executor.calls.find((call) => call.sql.includes('INSERT INTO audit_events'));
    expect(JSON.parse(auditCall?.params[4] as string)).toMatchObject({
      accorderingId: 'acc-1',
      vorigeStatus: 'wacht_op_proceseigenaar',
      nieuweStatus: 'wacht_op_archivaris',
      actor: 'user-1',
    });
  });

  it('weigert een ongeldige transitie', async () => {
    const executor = new FakeExecutor('review');
    const service = new WorkflowService({} as DbService);

    await expect(
      service.transition(
        { taakId: 'taak-1', taakuitvoeringId: 'uitvoering-1' },
        'goedgekeurd',
        gebruiker,
        'accordering.archivaris.akkoord',
        {},
        executor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('geeft 404 bij ontbrekende taakuitvoering', async () => {
    const executor = new FakeExecutor();
    const service = new WorkflowService({} as DbService);

    await expect(
      service.transition(
        { taakId: 'taak-1', taakuitvoeringId: 'uitvoering-1' },
        'review',
        gebruiker,
        'workflow.transition',
        {},
        executor,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
