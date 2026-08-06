import { Injectable } from '@nestjs/common';
import { TaakContext } from '../../common/api-types';
import { DbService } from '../../database/db.service';
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
}
