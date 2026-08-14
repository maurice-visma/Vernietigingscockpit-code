export interface StekkerClient {
  naam: string;
  fase: 'selectie' | 'uitvoering';
  haalStatusOp(taakuitvoeringId: string): Promise<StekkerStatus>;
  startSelectie?(request: SelectieStartRequest): Promise<SelectieStartResponse>;
  haalSelectieStatusOp?(selectieId: string): Promise<SelectieStatusResponse>;
  haalVernietigingskandidatenOp?(
    selectieId: string,
    pageToken?: string,
  ): Promise<VernietigingskandidaatPage>;
}

export interface StekkerStatus {
  stekkerId: string;
  naam: string;
  fase: 'selectie' | 'uitvoering';
  status: 'beschikbaar' | 'bezig' | 'fout';
  laatsteSynchronisatie?: string;
  versie?: string;
  configuratieId?: string;
}

export interface SelectieStartRequest {
  taakId: string;
  taakuitvoeringId: string;
  peildatum: string;
  correlationId: string;
}

export interface SelectieStartResponse {
  selectieId: string;
  stekkerId: string;
  stekkerVersie: string;
  status: 'gestart' | 'bezig' | 'voltooid';
  correlationId: string;
}

export interface SelectieStatusResponse {
  selectieId: string;
  status: 'gestart' | 'bezig' | 'voltooid' | 'fout';
  aantalKandidaten?: number;
  foutmelding?: string;
}

export interface Vernietigingskandidaat {
  kandidaatId: string;
  titel: string;
  omvangObjecten: number;
  bewaartermijn: number;
  vernietigingsdatum: string;
  bronId: string;
  bronSysteem: string;
  selectielijst?: string;
  grondslag?: string;
  metadata?: Record<string, unknown>;
}

export interface VernietigingskandidaatPage {
  selectieId: string;
  items: Vernietigingskandidaat[];
  nextPageToken?: string;
}
