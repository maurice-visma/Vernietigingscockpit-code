import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TaakContext, WorkflowStatus } from '../../common/api-types';
import { DbExecutor, DbService } from '../../database/db.service';
import { UserContext } from '../auth/user-context';

export interface Taakuitvoering {
  taakId: string;
  taakuitvoeringId: string;
  status: WorkflowStatus;
  huidigeStap: string;
  bijgewerktOp: string;
}

export interface WorkflowTransitionResult extends Taakuitvoering {
  vorigeStatus: WorkflowStatus;
  eventType: string;
}

const allowedTransitions: Partial<Record<WorkflowStatus, WorkflowStatus[]>> = {
  concept: ['selectie_bezig'],
  selectie_bezig: ['review'],
  review: ['wacht_op_proceseigenaar', 'selectie_bezig'],
  wacht_op_proceseigenaar: ['wacht_op_archivaris', 'review'],
  wacht_op_archivaris: ['goedgekeurd', 'review'],
  goedgekeurd: ['vernietiging_bezig'],
  vernietiging_bezig: ['afgerond'],
  afgerond: ['gearchiveerd'],
};

@Injectable()
export class WorkflowService {
  constructor(private readonly db: DbService) {}

  async getTaakuitvoering(context: TaakContext): Promise<Taakuitvoering> {
    const { rows } = await this.db.query<{
      taakId: string;
      taakuitvoeringId: string;
      status: WorkflowStatus;
      huidigeStap: string;
      bijgewerktOp: Date;
    }>(
      `
        SELECT
          taak_id AS "taakId",
          id AS "taakuitvoeringId",
          status,
          huidige_stap AS "huidigeStap",
          updated_at AS "bijgewerktOp"
        FROM taakuitvoeringen
        WHERE taak_id = $1
          AND id = $2
      `,
      [context.taakId, context.taakuitvoeringId],
    );

    if (rows[0]) {
      return {
        ...rows[0],
        bijgewerktOp: rows[0].bijgewerktOp.toISOString(),
      };
    }

    return {
      ...context,
      status: 'review',
      huidigeStap: 'Beoordelen vernietigingsdossier',
      bijgewerktOp: new Date().toISOString(),
    };
  }

  registreerActie(context: TaakContext, actie: string): string {
    return `${context.taakId}:${context.taakuitvoeringId}:${actie}`;
  }

  async transition(
    context: TaakContext,
    targetStatus: WorkflowStatus,
    gebruiker: UserContext,
    eventType: string,
    payload: Record<string, unknown> = {},
    executor: DbExecutor = this.db,
  ): Promise<WorkflowTransitionResult> {
    const current = await this.getTaakuitvoeringForUpdate(context, executor);
    const allowedTargets = allowedTransitions[current.status] ?? [];

    if (!allowedTargets.includes(targetStatus)) {
      throw new BadRequestException(
        `Workflowtransitie van ${current.status} naar ${targetStatus} is niet toegestaan.`,
      );
    }

    const volgendeStap = this.huidigeStapVoor(targetStatus);
    const { rows } = await executor.query<{
      taakId: string;
      taakuitvoeringId: string;
      status: WorkflowStatus;
      huidigeStap: string;
      bijgewerktOp: Date;
    }>(
      `
        UPDATE taakuitvoeringen
        SET status = $3,
            huidige_stap = $4,
            updated_at = now()
        WHERE taak_id = $1
          AND id = $2
        RETURNING
          taak_id AS "taakId",
          id AS "taakuitvoeringId",
          status,
          huidige_stap AS "huidigeStap",
          updated_at AS "bijgewerktOp"
      `,
      [context.taakId, context.taakuitvoeringId, targetStatus, volgendeStap],
    );

    await executor.query(
      `
        INSERT INTO audit_events (taakuitvoering_id, actor, event_type, message, payload)
        VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        context.taakuitvoeringId,
        gebruiker.id,
        eventType,
        `Workflowstatus gewijzigd van ${current.status} naar ${targetStatus}.`,
        JSON.stringify({
          ...payload,
          taakId: context.taakId,
          taakuitvoeringId: context.taakuitvoeringId,
          vorigeStatus: current.status,
          nieuweStatus: targetStatus,
          actor: gebruiker.id,
          rollen: gebruiker.rollen,
        }),
      ],
    );

    return {
      ...rows[0],
      bijgewerktOp: rows[0].bijgewerktOp.toISOString(),
      vorigeStatus: current.status,
      eventType,
    };
  }

  private async getTaakuitvoeringForUpdate(context: TaakContext, executor: DbExecutor): Promise<Taakuitvoering> {
    const { rows } = await executor.query<{
      taakId: string;
      taakuitvoeringId: string;
      status: WorkflowStatus;
      huidigeStap: string;
      bijgewerktOp: Date;
    }>(
      `
        SELECT
          taak_id AS "taakId",
          id AS "taakuitvoeringId",
          status,
          huidige_stap AS "huidigeStap",
          updated_at AS "bijgewerktOp"
        FROM taakuitvoeringen
        WHERE taak_id = $1
          AND id = $2
        FOR UPDATE
      `,
      [context.taakId, context.taakuitvoeringId],
    );

    if (!rows[0]) {
      throw new NotFoundException('Taakuitvoering niet gevonden.');
    }

    return {
      ...rows[0],
      bijgewerktOp: rows[0].bijgewerktOp.toISOString(),
    };
  }

  private huidigeStapVoor(status: WorkflowStatus): string {
    const labels: Record<WorkflowStatus, string> = {
      concept: 'Concept taak',
      selectie_bezig: 'Selectie ophalen',
      review: 'Beoordelen vernietigingsdossier',
      wacht_op_proceseigenaar: 'Accordering proceseigenaar',
      wacht_op_archivaris: 'Finale accordering archivaris',
      goedgekeurd: 'Gereed voor vernietiging',
      vernietiging_bezig: 'Vernietiging uitvoeren',
      afgerond: 'Verklaring genereren',
      gearchiveerd: 'Gearchiveerd',
    };

    return labels[status];
  }
}
