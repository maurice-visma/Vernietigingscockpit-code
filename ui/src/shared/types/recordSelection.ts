export type RecordSelectionStatus =
  | "selecteerbaar"
  | "controle-nodig"
  | "uitgesloten";

export type RecordSelectionRecord = {
  id: string;
  title: string;
  description: string;
  recordType: string;
  department: string;
  processOwner: string;
  archivist: string;
  retentionPeriodYears: number;
  destroyableSince: string;
  source: string;
  caseType: string;
  status: RecordSelectionStatus;
};

export type RecordSelectionQuickFilter = {
  id: string;
  label: string;
  description: string;
  department?: string;
  source?: string;
  status?: RecordSelectionStatus;
};

export type RecordSelectionSortOption = {
  id: "destroyable-since" | "title" | "department";
  label: string;
};
