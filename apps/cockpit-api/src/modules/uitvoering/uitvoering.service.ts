import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { actieGeaccepteerd } from '../../common/not-implemented-response';
import { TaakContext } from '../../common/api-types';
import { DbService } from '../../database/db.service';
import { UserContext } from '../auth/user-context';
import { StekkerService } from '../stekker/stekker.service';
import { WorkflowService } from '../workflow/workflow.service';
import { StartSelectieDto, StartVernietigingDto } from './uitvoering.dto';

@Injectable()
export class UitvoeringService {
  constructor(
    private readonly db: DbService,
    private readonly stekkerService: StekkerService,
    private readonly workflowService: WorkflowService,
  ) {}

  async startSelectie(context: TaakContext, _dto: StartSelectieDto, gebruiker?: UserContext) {
    const actieId = this.workflowService.registreerActie(context, 'start-selectie');
    const actor = gebruiker ?? { id: 'system', naam: 'Systeemgebruiker', rollen: ['beheerder'] };
    const correlationId = randomUUID();
    const peildatum = new Date().toISOString();

    return this.db.transaction(async (client) => {
      const selectie = await this.stekkerService.startSelectie({
        ...context,
        peildatum,
        correlationId,
      });

      await client.query(
        `
          UPDATE dossiers
          SET metadata = metadata || $3::jsonb,
              updated_at = now()
          WHERE taakuitvoering_id = $1
            AND EXISTS (
              SELECT 1
              FROM taakuitvoeringen
              WHERE taakuitvoeringen.id = dossiers.taakuitvoering_id
                AND taakuitvoeringen.taak_id = $2
            )
        `,
        [
          context.taakuitvoeringId,
          context.taakId,
          JSON.stringify({
            selectieContext: {
              actieId,
              selectieId: selectie.selectieId,
              stekkerId: selectie.stekkerId,
              stekkerVersie: selectie.stekkerVersie,
              peildatum,
              correlationId,
            },
          }),
        ],
      );

      await client.query(
        `
          INSERT INTO audit_events (taakuitvoering_id, actor, event_type, message, payload)
          VALUES ($1, $2, $3, $4, $5::jsonb)
        `,
        [
          context.taakuitvoeringId,
          actor.id,
          'uitvoering.selectie.gestart',
          'Selectie gestart via stekkercontract.',
          JSON.stringify({
            taakId: context.taakId,
            taakuitvoeringId: context.taakuitvoeringId,
            actieId,
            selectie,
            peildatum,
            correlationId,
            actor: actor.id,
            rollen: actor.rollen,
          }),
        ],
      );

      return {
        ...actieGeaccepteerd(actieId, 'Selectie is ingepland.'),
        selectieId: selectie.selectieId,
        stekkerId: selectie.stekkerId,
        stekkerVersie: selectie.stekkerVersie,
        correlationId,
      };
    });
  }

  startVernietiging(context: TaakContext, _dto: StartVernietigingDto) {
    const actieId = this.workflowService.registreerActie(context, 'start-vernietiging');
    return actieGeaccepteerd(actieId, 'Vernietiging is ingepland.');
  }

  archiveerTaakuitvoering(context: TaakContext) {
    const actieId = this.workflowService.registreerActie(context, 'archiveer-taakuitvoering');
    return actieGeaccepteerd(actieId, 'Archivering is ingepland.');
  }
}
