import type { VernietigingsObject } from "../types/destruction";
import type { DestructionResultRow } from "../types/destructionResult";
import { reviewRows } from "../mocks/reviewRows";
import { authHeaders } from "../auth/keycloakAuth";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

type ListResponse<T> = {
  items: T[];
  total: number;
};

type ActieStatus = {
  actieId: string;
  status: "geaccepteerd" | "gepland" | "afgewezen";
  bericht: string;
};

export type TaskExecutionSummary = {
  taakId: string;
  taakuitvoeringId: string;
  status: string;
  huidigeStap: string;
  bijgewerktOp: string;
  naam: string;
  frequentie: string;
  recordmanager: string;
  gestartOp?: string;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const authenticationHeaders = await authHeaders();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authenticationHeaders,
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function startSelectie(taakId: string, taakuitvoeringId: string) {
  return request<ActieStatus>(
    `/taken/${taakId}/taakuitvoeringen/${taakuitvoeringId}/selectie`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}

export function listReviewRows(taakId: string, taakuitvoeringId: string) {
  return request<ListResponse<VernietigingsObject>>(
    `/taken/${taakId}/taakuitvoeringen/${taakuitvoeringId}/reviewregels`
  ).catch(() => ({
    items: reviewRows.map((row) => ({ ...row })),
    total: reviewRows.length,
  }));
}

export function markReviewRowsReviewed(
  taakId: string,
  taakuitvoeringId: string,
  reviewregelIds: string[]
) {
  return request(`/taken/${taakId}/taakuitvoeringen/${taakuitvoeringId}/reviewregels/markeer-beoordeeld`, {
    method: "POST",
    body: JSON.stringify({ reviewregelIds }),
  });
}

export function submitReviewToProcessOwner(taakId: string, taakuitvoeringId: string) {
  return request(`/taken/${taakId}/taakuitvoeringen/${taakuitvoeringId}/review/doorzetten`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

export function listTaskExecutions() {
  return request<ListResponse<TaskExecutionSummary>>("/taken/taakuitvoeringen");
}

export function listDestructionResults(taakId: string, taakuitvoeringId: string) {
  return request<ListResponse<DestructionResultRow>>(
    `/taken/${taakId}/taakuitvoeringen/${taakuitvoeringId}/resultaatregels`
  );
}
