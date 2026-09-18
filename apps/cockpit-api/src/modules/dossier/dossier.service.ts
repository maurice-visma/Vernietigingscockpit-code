import { Injectable, NotFoundException } from '@nestjs/common';
import { TaakContext } from '../../common/api-types';
import { DbService } from '../../database/db.service';
import { UserContext } from '../auth/user-context';
import { MarkeerBeoordeeldDto, ReviewregelQueryDto, UpdateReviewregelDto } from './dossier.dto';

type Reviewregel = {
  id: string;
  titel: string;
  omvang: number;
  bewaartermijn: number;
  vernietigingsdatum: string;
  status?: string;
  beoordeeld: boolean;
  uitgesloten: boolean;
  reden?: string;
  toelichting?: string;
  proceseigenaarToelichting?: string;
  archivarisToelichting?: string;
  bron_id?: string;
  code?: string;
  startdatum?: string;
  einddatum?: string;
  selectielijst?: string;
  resultaat?: string;
  grondslag?: string;
  bron_systeem?: string;
};

type ReviewregelListResponse = {
  taakId: string;
  taakuitvoeringId: string;
  filters: ReviewregelQueryDto;
  items: Reviewregel[];
  page: number;
  pageSize: number;
  total: number;
};

type Resultaatregel = {
  id: string;
  titel: string;
  stekker: string;
  vernietigingsstatus: string;
  omvang?: number;
  vernietigingsdatum?: string;
  bron_id?: string;
  code?: string;
  grondslag?: string;
  bron_systeem?: string;
  melding?: string;
};

type ResultaatregelListResponse = TaakContext & {
  items: Resultaatregel[];
  total: number;
};

@Injectable()
export class DossierService {
  constructor(private readonly db: DbService) {}

  async listReviewregels(context: TaakContext, query: ReviewregelQueryDto): Promise<ReviewregelListResponse> {
    const filters: string[] = ['t.id = $1', 'tu.id = $2'];
    const params: unknown[] = [context.taakId, context.taakuitvoeringId];

    if (query.status) {
      params.push(query.status);
      filters.push(`vo.review_status = $${params.length}`);
    }

    if (query.zoekterm) {
      params.push(`%${query.zoekterm}%`);
      filters.push(`(vo.titel ILIKE $${params.length} OR vo.bron_id ILIKE $${params.length})`);
    }

    if (query.alleenUitzonderingen) {
      filters.push('vo.uitgesloten = true');
    }

    const { rows } = await this.db.query<Reviewregel>(
      `
        SELECT
          vo.id,
          vo.titel,
          vo.omvang,
          vo.bewaartermijn,
          vo.vernietigingsdatum,
          vo.review_status AS status,
          vo.beoordeeld,
          vo.uitgesloten,
          vo.reden,
          vo.toelichting,
          vo.proceseigenaar_toelichting AS "proceseigenaarToelichting",
          vo.archivaris_toelichting AS "archivarisToelichting",
          vo.bron_id,
          vo.code,
          vo.startdatum,
          vo.einddatum,
          vo.selectielijst,
          vo.resultaat,
          vo.grondslag,
          vo.bron_systeem
        FROM vernietigingsobjecten vo
        JOIN dossiers d ON d.id = vo.dossier_id
        JOIN taakuitvoeringen tu ON tu.id = d.taakuitvoering_id
        JOIN taken t ON t.id = tu.taak_id
        WHERE ${filters.join(' AND ')}
        ORDER BY vo.id::integer ASC
      `,
      params,
    );

    return {
      taakId: context.taakId,
      taakuitvoeringId: context.taakuitvoeringId,
      filters: query,
      items: rows,
      page: 1,
      pageSize: 25,
      total: rows.length,
    };
  }

  async updateReviewregel(
    context: TaakContext,
    reviewregelId: string,
    dto: UpdateReviewregelDto,
    gebruiker: UserContext,
  ) {
    return this.db.transaction(async (client) => {
      const { rows: beforeRows } = await client.query<{
        id: string;
        status?: string;
        reden?: string;
        toelichting?: string;
        beoordeeld: boolean;
        uitgesloten: boolean;
      }>(
        `
          SELECT
            vo.id,
            vo.review_status AS status,
            vo.reden,
            vo.toelichting,
            vo.beoordeeld,
            vo.uitgesloten
          FROM vernietigingsobjecten vo
          JOIN dossiers d ON d.id = vo.dossier_id
          JOIN taakuitvoeringen tu ON tu.id = d.taakuitvoering_id
          WHERE tu.taak_id = $1
            AND tu.id = $2
            AND vo.id = $3
          FOR UPDATE
        `,
        [context.taakId, context.taakuitvoeringId, reviewregelId],
      );

      if (!beforeRows[0]) {
        throw new NotFoundException('Reviewregel niet gevonden.');
      }

      const vorigeWaarden = beforeRows[0];
      const { rows } = await client.query<{
        id: string;
        status?: string;
        reden?: string;
        toelichting?: string;
        bijgewerktOp: Date;
      }>(
        `
          UPDATE vernietigingsobjecten vo
          SET review_status = COALESCE($4, vo.review_status),
              reden = COALESCE($5, vo.reden),
              toelichting = COALESCE($6, vo.toelichting),
              updated_at = now()
          FROM dossiers d
          JOIN taakuitvoeringen tu ON tu.id = d.taakuitvoering_id
          WHERE vo.dossier_id = d.id
            AND tu.taak_id = $1
            AND tu.id = $2
            AND vo.id = $3
          RETURNING
            vo.id,
            vo.review_status AS status,
            vo.reden,
            vo.toelichting,
            vo.updated_at AS "bijgewerktOp"
        `,
        [
          context.taakId,
          context.taakuitvoeringId,
          reviewregelId,
          dto.status,
          dto.uitzonderingsreden,
          dto.toelichting,
        ],
      );

      await client.query(
        `
          INSERT INTO audit_events (taakuitvoering_id, vernietigingsobject_id, actor, event_type, message, payload)
          VALUES ($1, $2, $3, $4, $5, $6::jsonb)
        `,
        [
          context.taakuitvoeringId,
          reviewregelId,
          gebruiker.id,
          'dossier.reviewregel.bijgewerkt',
          'Reviewregel bijgewerkt.',
          JSON.stringify({
            taakId: context.taakId,
            taakuitvoeringId: context.taakuitvoeringId,
            reviewregelId,
            actor: gebruiker.id,
            rollen: gebruiker.rollen,
            vorigeWaarden,
            nieuweWaarden: rows[0],
          }),
        ],
      );

      return {
        ...context,
        reviewregelId,
        ...dto,
        gevonden: true,
        bijgewerktOp: rows[0].bijgewerktOp.toISOString(),
      };
    });
  }

  async markeerBeoordeeld(context: TaakContext, dto: MarkeerBeoordeeldDto, gebruiker: UserContext) {
    return this.db.transaction(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `
          UPDATE vernietigingsobjecten vo
          SET beoordeeld = true,
              updated_at = now()
          FROM dossiers d
          JOIN taakuitvoeringen tu ON tu.id = d.taakuitvoering_id
          WHERE vo.dossier_id = d.id
            AND tu.taak_id = $1
            AND tu.id = $2
            AND vo.id = ANY($3::text[])
          RETURNING vo.id
        `,
        [context.taakId, context.taakuitvoeringId, dto.reviewregelIds],
      );

      const updatedIds = new Set(rows.map((row) => row.id));
      await client.query(
        `
          INSERT INTO audit_events (taakuitvoering_id, actor, event_type, message, payload)
          VALUES ($1, $2, $3, $4, $5::jsonb)
        `,
        [
          context.taakuitvoeringId,
          gebruiker.id,
          'dossier.reviewregels.beoordeeld',
          'Reviewregels gemarkeerd als beoordeeld.',
          JSON.stringify({
            taakId: context.taakId,
            taakuitvoeringId: context.taakuitvoeringId,
            actor: gebruiker.id,
            rollen: gebruiker.rollen,
            gevraagd: dto.reviewregelIds,
            bijgewerkt: rows.map((row) => row.id),
            aantalBijgewerkt: rows.length,
          }),
        ],
      );

      return {
        ...context,
        items: dto.reviewregelIds.map((reviewregelId) => ({
          reviewregelId,
          status: updatedIds.has(reviewregelId) ? 'beoordeeld' : 'niet_gevonden',
        })),
      };
    });
  }

  async listResultaatregels(context: TaakContext): Promise<ResultaatregelListResponse> {
    const { rows } = await this.db.query<Resultaatregel>(
      `
        SELECT
          vernietigingsresultaten.id,
          vernietigingsresultaten.titel,
          vernietigingsresultaten.stekker,
          vernietigingsresultaten.vernietigingsstatus,
          vernietigingsresultaten.omvang,
          vernietigingsresultaten.vernietigingsdatum,
          vernietigingsresultaten.bron_id,
          vernietigingsresultaten.code,
          vernietigingsresultaten.grondslag,
          vernietigingsresultaten.bron_systeem,
          vernietigingsresultaten.melding
        FROM vernietigingsresultaten
        JOIN taakuitvoeringen ON taakuitvoeringen.id = vernietigingsresultaten.taakuitvoering_id
        WHERE taakuitvoeringen.taak_id = $1
          AND vernietigingsresultaten.taakuitvoering_id = $2
        ORDER BY vernietigingsresultaten.id ASC
      `,
      [context.taakId, context.taakuitvoeringId],
    );

    return {
      ...context,
      items: rows,
      total: rows.length,
    };
  }

  async getVernietigingsverklaring(context: TaakContext) {
    const { rows } = await this.db.query<{
      taakNaam: string;
      taakuitvoeringStatus: string;
      huidigeStap: string;
      dossierId: string;
      dossierNaam: string;
      dossierStatus: string;
      dossierMetadata: Record<string, unknown>;
    }>(
      `
        SELECT
          t.naam AS "taakNaam",
          tu.status AS "taakuitvoeringStatus",
          tu.huidige_stap AS "huidigeStap",
          d.id::text AS "dossierId",
          d.naam AS "dossierNaam",
          d.status AS "dossierStatus",
          d.metadata AS "dossierMetadata"
        FROM taakuitvoeringen tu
        JOIN taken t ON t.id = tu.taak_id
        JOIN dossiers d ON d.taakuitvoering_id = tu.id
        WHERE tu.taak_id = $1
          AND tu.id = $2
      `,
      [context.taakId, context.taakuitvoeringId],
    );

    if (!rows[0]) {
      throw new NotFoundException('Dossier niet gevonden.');
    }

    const [{ rows: auditEvents }, { rows: resultaatStatussen }, { rows: reviewSamenvatting }] = await Promise.all([
      this.db.query<{
        id: string;
        actor: string;
        eventType: string;
        message: string;
        payload: Record<string, unknown>;
        createdAt: Date;
      }>(
        `
          SELECT
            id::text,
            actor,
            event_type AS "eventType",
            message,
            payload,
            created_at AS "createdAt"
          FROM audit_events
          WHERE taakuitvoering_id = $1
          ORDER BY created_at ASC
        `,
        [context.taakuitvoeringId],
      ),
      this.db.query<{ status: string; aantal: string }>(
        `
          SELECT vernietigingsstatus AS status, count(*)::text AS aantal
          FROM vernietigingsresultaten
          WHERE taakuitvoering_id = $1
          GROUP BY vernietigingsstatus
          ORDER BY vernietigingsstatus ASC
        `,
        [context.taakuitvoeringId],
      ),
      this.db.query<{ totaal: string; beoordeeld: string; uitgesloten: string }>(
        `
          SELECT
            count(*)::text AS totaal,
            count(*) FILTER (WHERE beoordeeld)::text AS beoordeeld,
            count(*) FILTER (WHERE uitgesloten)::text AS uitgesloten
          FROM vernietigingsobjecten vo
          JOIN dossiers d ON d.id = vo.dossier_id
          WHERE d.taakuitvoering_id = $1
        `,
        [context.taakuitvoeringId],
      ),
    ]);

    const heeftFinaleAccordering = auditEvents.some(
      (event) => event.eventType === 'besluitvorming.accordering.archivaris',
    );

    return {
      ...context,
      verklaringId: `verklaring-${context.taakuitvoeringId}`,
      status: heeftFinaleAccordering ? 'beschikbaar' : 'niet_beschikbaar',
      ontbrekendeVoorwaarden: heeftFinaleAccordering ? [] : ['Finale accordering door archivaris ontbreekt.'],
      gegenereerdOp: new Date().toISOString(),
      dossier: rows[0],
      selectieContext: rows[0].dossierMetadata?.selectieContext,
      reviewSamenvatting: {
        totaal: Number(reviewSamenvatting[0]?.totaal ?? 0),
        beoordeeld: Number(reviewSamenvatting[0]?.beoordeeld ?? 0),
        uitgesloten: Number(reviewSamenvatting[0]?.uitgesloten ?? 0),
      },
      resultaatStatussen: resultaatStatussen.map((row) => ({
        status: row.status,
        aantal: Number(row.aantal),
      })),
      auditEvents: auditEvents.map((event) => ({
        ...event,
        createdAt: event.createdAt.toISOString(),
      })),
    };
  }

  exporteerVernietigingsresultaat(context: TaakContext) {
    return {
      ...context,
      exportId: `export-${context.taakuitvoeringId}`,
      status: 'gepland',
    };
  }
}
