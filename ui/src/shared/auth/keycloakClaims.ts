export type TokenClaims = {
  sub?: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] }>;
};

export function claimsFromTokens(accessToken: string, idToken?: string): TokenClaims {
  const identityClaims = decodeJwtClaims(idToken ?? accessToken);
  const accessClaims = decodeJwtClaims(accessToken);

  return {
    ...identityClaims,
    realm_access: accessClaims.realm_access ?? identityClaims.realm_access,
    resource_access: accessClaims.resource_access ?? identityClaims.resource_access,
  };
}

function decodeJwtClaims(token: string): TokenClaims {
  const [, payload] = token.split(".");
  if (!payload) {
    return {};
  }

  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return JSON.parse(globalThis.atob(padded)) as TokenClaims;
}
