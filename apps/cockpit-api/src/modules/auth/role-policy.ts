export const COCKPIT_ROLES = {
  recordmanager: 'recordmanager',
  proceseigenaar: 'proceseigenaar',
  archivaris: 'archivaris',
  beheerder: 'beheerder',
} as const;

export const ALL_COCKPIT_ROLES = Object.values(COCKPIT_ROLES);

export const DOSSIER_READ_ROLES = [
  COCKPIT_ROLES.recordmanager,
  COCKPIT_ROLES.proceseigenaar,
  COCKPIT_ROLES.archivaris,
];

export const RECORDMANAGER_ONLY = [COCKPIT_ROLES.recordmanager];

export const STEKKER_STATUS_ROLES = [
  COCKPIT_ROLES.recordmanager,
  COCKPIT_ROLES.beheerder,
];
