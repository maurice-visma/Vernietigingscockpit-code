export const ACCESS_TOKEN_REFRESH_MARGIN_MS = 30_000;

export type RefreshableSession = {
  expiresAt: number;
  refreshToken?: string;
};

export type OidcTokenResponse = {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

export function accessTokenNeedsRefresh(
  session: RefreshableSession,
  now = Date.now(),
): boolean {
  return session.expiresAt <= now + ACCESS_TOKEN_REFRESH_MARGIN_MS;
}

export async function requestTokenRefresh(
  tokenEndpoint: string,
  clientId: string,
  refreshToken: string,
  fetcher: typeof fetch = fetch,
): Promise<OidcTokenResponse> {
  const response = await fetcher(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Keycloak token refresh failed with ${response.status}`);
  }

  return response.json() as Promise<OidcTokenResponse>;
}
