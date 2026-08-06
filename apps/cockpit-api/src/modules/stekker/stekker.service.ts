import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  SelectieStartRequest,
  SelectieStartResponse,
  StekkerStatus,
  VernietigingskandidaatPage,
} from './ports/stekker-client';

@Injectable()
export class StekkerService {
  listStekkers(taakuitvoeringId: string, fase?: 'selectie' | 'uitvoering'): StekkerStatus[] {
    const stekkers: StekkerStatus[] = [
      {
        stekkerId: 'selectie-bron',
        naam: 'Selectiebron',
        fase: 'selectie',
        status: 'beschikbaar',
        versie: '1.0.0',
        configuratieId: 'stekker-config-selectie-v1',
        laatsteSynchronisatie: new Date().toISOString(),
      },
      {
        stekkerId: 'vernietiging-doel',
        naam: 'Vernietigingsdoel',
        fase: 'uitvoering',
        status: 'beschikbaar',
        versie: '1.0.0',
        configuratieId: 'stekker-config-uitvoering-v1',
        laatsteSynchronisatie: new Date().toISOString(),
      },
    ];

    return stekkers
      .filter((stekker) => !fase || stekker.fase === fase)
      .map((stekker) => ({ ...stekker, taakuitvoeringId }) as StekkerStatus);
  }

  async startSelectie(request: SelectieStartRequest): Promise<SelectieStartResponse> {
    return {
      selectieId: `sel-${request.taakuitvoeringId}-${randomUUID()}`,
      stekkerId: 'selectie-bron',
      stekkerVersie: '1.0.0',
      status: 'voltooid',
      correlationId: request.correlationId,
    };
  }

  async haalVernietigingskandidatenOp(selectieId: string): Promise<VernietigingskandidaatPage> {
    return {
      selectieId,
      items: [
        {
          kandidaatId: '1',
          titel: 'Contracten 2021 - Leveranciers',
          omvangObjecten: 3,
          bewaartermijn: 7,
          vernietigingsdatum: '2026-01',
          bronId: 'ZRC-2021-00441',
          bronSysteem: 'Zaaksysteem A',
          selectielijst: 'VNG 2017',
          grondslag: 'Art. 3 Archiefwet',
        },
      ],
    };
  }
}
