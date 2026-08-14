import { ForbiddenException, Injectable } from '@nestjs/common';
import { TaakContext } from '../../common/api-types';
import { DbExecutor, DbService } from '../../database/db.service';
import { UserContext } from '../auth/user-context';
import { WorkflowService } from '../workflow/workflow.service';
import { AccorderingDto } from './besluitvorming.dto';

@Injectable()
export class BesluitvormingService {
  constructor(
    private readonly db: DbService,
    private readonly workflowService: WorkflowService,
  ) {}

  legProceseigenaarAccorderingVast(context: TaakContext, dto: AccorderingDto, gebruiker: UserContext) {
    return this.legAccorderingVast(context, 'proceseigenaar', dto, gebruiker);
  }

  legArchivarisAccorderingVast(context: TaakContext, dto: AccorderingDto, gebruiker: UserContext) {
    return this.legAccorderingVast(context, 'archivaris', dto, gebruiker);
  }

  private async legAccorderingVast(
    context: TaakContext,
    rol: 'proceseigenaar' | 'archivaris',
    dto: AccorderingDto,
    gebruiker: UserContext,
  ) {
    return this.db.transaction(async (client) => {
      const accorderingId = this.workflowService.registreerActie(context, `accordering-${rol}`);
      await this.assertFunctiescheiding(context.taakuitvoeringId, rol, gebruiker, client);
      const targetStatus = dto.akkoord
        ? rol === 'proceseigenaar'
          ? 'wacht_op_archivaris'
          : 'goedgekeurd'
        : 'review';

      const workflow = await this.workflowService.transition(
        context,
        targetStatus,
        gebruiker,
        `accordering.${rol}.${dto.akkoord ? 'akkoord' : 'teruggestuurd'}`,
        {
          accorderingId,
          rol,
          akkoord: dto.akkoord,
          toelichting: dto.toelichting,
        },
        client,
      );

      await client.query(
        `
          INSERT INTO audit_events (taakuitvoering_id, actor, event_type, message, payload)
          VALUES ($1, $2, $3, $4, $5::jsonb)
        `,
        [
          context.taakuitvoeringId,
          gebruiker.id,
          `besluitvorming.accordering.${rol}`,
          `Accordering door ${rol} vastgelegd.`,
          JSON.stringify({
            taakId: context.taakId,
            taakuitvoeringId: context.taakuitvoeringId,
            accorderingId,
            rol,
            akkoord: dto.akkoord,
            toelichting: dto.toelichting,
            vastgelegdDoor: gebruiker.id,
            rollen: gebruiker.rollen,
            workflow: {
              vorigeStatus: workflow.vorigeStatus,
              nieuweStatus: workflow.status,
            },
          }),
        ],
      );

      return {
        ...context,
        accorderingId,
        rol,
        akkoord: dto.akkoord,
        toelichting: dto.toelichting,
        vastgelegdDoor: gebruiker.id,
        vastgelegdOp: workflow.bijgewerktOp,
        workflow,
      };
    });
  }

  private async assertFunctiescheiding(
    taakuitvoeringId: string,
    rol: 'proceseigenaar' | 'archivaris',
    gebruiker: UserContext,
    client: DbExecutor,
  ) {
    if (rol !== 'archivaris') {
      return;
    }

    const { rows } = await client.query<{ id: string }>(
      `
        SELECT id
        FROM audit_events
        WHERE taakuitvoering_id = $1
          AND actor = $2
          AND event_type = 'besluitvorming.accordering.proceseigenaar'
        LIMIT 1
      `,
      [taakuitvoeringId, gebruiker.id],
    );

    if (rows.length) {
      throw new ForbiddenException('Functiescheiding blokkeert accordering door dezelfde actor.');
    }
  }
}
