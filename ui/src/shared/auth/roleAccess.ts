export const COCKPIT_ROLES = {
  recordmanager: "recordmanager",
  proceseigenaar: "proceseigenaar",
  archivaris: "archivaris",
  beheerder: "beheerder",
} as const;

export type CockpitRole = (typeof COCKPIT_ROLES)[keyof typeof COCKPIT_ROLES];

export type Capability =
  | "dashboard"
  | "taskDefinition"
  | "selection"
  | "review"
  | "processOwnerApproval"
  | "archivistApproval"
  | "destruction"
  | "results";

const CAPABILITY_ROLES: Record<Capability, CockpitRole[]> = {
  dashboard: Object.values(COCKPIT_ROLES),
  taskDefinition: [COCKPIT_ROLES.recordmanager, COCKPIT_ROLES.beheerder],
  selection: [COCKPIT_ROLES.recordmanager],
  review: [COCKPIT_ROLES.recordmanager],
  processOwnerApproval: [COCKPIT_ROLES.proceseigenaar],
  archivistApproval: [COCKPIT_ROLES.archivaris],
  destruction: [COCKPIT_ROLES.recordmanager],
  results: [COCKPIT_ROLES.recordmanager],
};

export function canAccessCapability(roles: string[], capability: Capability) {
  return CAPABILITY_ROLES[capability].some((role) => roles.includes(role));
}

export function workflowRouteForRoles(
  roles: string[],
  step: string,
  taakId: string,
  taakuitvoeringId: string,
): string | null {
  const base = `/taak/${taakId}/taakuitvoering/${taakuitvoeringId}`;
  const routes: Record<string, { capability: Capability; path: string }> = {
    Selectie: { capability: "selection", path: `${base}/selectie` },
    Beoordeling: { capability: "review", path: `${base}/beoordeling` },
    "Accordering PO": {
      capability: "processOwnerApproval",
      path: `${base}/accordering/proceseigenaar`,
    },
    "Accordering Archivaris": {
      capability: "archivistApproval",
      path: `${base}/accordering/archivaris`,
    },
    Uitvoering: { capability: "destruction", path: `${base}/uitvoering` },
    Resultaat: { capability: "results", path: `${base}/resultaat` },
  };
  const route = routes[step];

  return route && canAccessCapability(roles, route.capability) ? route.path : null;
}
