const AUTH_SESSION_KEY = "vernietigingscockpit.auth.session";
const AUTH_FLOW_KEY = "vernietigingscockpit.auth.pkce";
const AUTH_CALLBACK_KEY = "vernietigingscockpit.auth.callback";

export type AuthMode = "dev" | "keycloak";

export type AuthUser = {
  id: string;
  name: string;
  roles: string[];
  initials: string;
};

export type AuthSession = {
  accessToken: string;
  idToken?: string;
  refreshToken?: string;
  expiresAt: number;
  user: AuthUser;
};

type TokenResponse = {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
};

type StoredFlow = {
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectUri: string;
  returnTo: string;
};

type TokenClaims = {
  sub?: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] }>;
};

export function authMode(): AuthMode {
  return import.meta.env.VITE_AUTH_MODE === "keycloak" ? "keycloak" : "dev";
}

export function isKeycloakAuthEnabled() {
  return authMode() === "keycloak";
}

export function keycloakConfigComplete() {
  return Boolean(import.meta.env.VITE_KEYCLOAK_ISSUER && import.meta.env.VITE_KEYCLOAK_CLIENT_ID);
}

export function getDevUser(): AuthUser {
  const name = import.meta.env.VITE_DEV_USER_NAME ?? "Lokale ontwikkelaar";
  return {
    id: import.meta.env.VITE_DEV_USER_ID ?? "dev-user",
    name,
    roles: splitRoles(import.meta.env.VITE_DEV_USER_ROLES ?? "beheerder"),
    initials: initialsForName(name),
  };
}

export function getAuthSession(): AuthSession | null {
  if (!isKeycloakAuthEnabled()) {
    const user = getDevUser();
    return {
      accessToken: "development-header-fallback",
      expiresAt: Number.MAX_SAFE_INTEGER,
      user,
    };
  }

  const rawSession = window.sessionStorage.getItem(AUTH_SESSION_KEY);
  if (!rawSession) {
    return null;
  }

  const session = JSON.parse(rawSession) as AuthSession;
  if (session.expiresAt <= Date.now() + 30_000) {
    clearAuthSession();
    return null;
  }

  return session;
}

export async function authHeaders(): Promise<Record<string, string>> {
  if (!isKeycloakAuthEnabled()) {
    const user = getDevUser();
    return {
      "x-user-id": user.id,
      "x-user-name": user.name,
      "x-user-roles": user.roles.join(","),
    };
  }

  const session = getAuthSession();
  return session ? { Authorization: `Bearer ${session.accessToken}` } : {};
}

export async function startLogin(returnTo = currentRelativeUrl()) {
  assertKeycloakConfigured();

  const issuer = normalizedIssuer();
  const redirectUri = redirectUriForCurrentOrigin();
  const state = randomUrlSafe(32);
  const nonce = randomUrlSafe(32);
  const codeVerifier = randomUrlSafe(64);
  const codeChallenge = await pkceChallenge(codeVerifier);

  const flow: StoredFlow = {
    state,
    nonce,
    codeVerifier,
    redirectUri,
    returnTo,
  };
  window.sessionStorage.setItem(AUTH_FLOW_KEY, JSON.stringify(flow));

  const authorizationUrl = new URL(`${issuer}/protocol/openid-connect/auth`);
  authorizationUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: import.meta.env.VITE_KEYCLOAK_SCOPE ?? "openid profile email",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  }).toString();

  window.location.assign(authorizationUrl.toString());
}

export async function completeLoginCallback(callbackUrl: URL) {
  assertKeycloakConfigured();

  const error = callbackUrl.searchParams.get("error");
  if (error) {
    throw new Error(callbackUrl.searchParams.get("error_description") ?? error);
  }

  const code = callbackUrl.searchParams.get("code");
  const state = callbackUrl.searchParams.get("state");
  const flow = storedFlow();

  if (!code || !state || !flow || state !== flow.state) {
    throw new Error("Ongeldige Keycloak callback.");
  }

  const callbackKey = `${state}:${code}`;
  if (window.sessionStorage.getItem(AUTH_CALLBACK_KEY) === callbackKey) {
    await waitForStoredSession();
    return flow.returnTo;
  }

  window.sessionStorage.setItem(AUTH_CALLBACK_KEY, callbackKey);

  try {
    const tokenResponse = await fetch(`${normalizedIssuer()}/protocol/openid-connect/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
        redirect_uri: flow.redirectUri,
        code,
        code_verifier: flow.codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`Keycloak token request failed with ${tokenResponse.status}`);
    }

    const tokens = (await tokenResponse.json()) as TokenResponse;
    const claims = decodeJwtClaims(tokens.id_token ?? tokens.access_token);
    const user = userFromClaims(claims);
    const session: AuthSession = {
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in ?? 300) * 1000,
      user,
    };

    window.sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    window.sessionStorage.removeItem(AUTH_FLOW_KEY);
    window.sessionStorage.removeItem(AUTH_CALLBACK_KEY);

    return flow.returnTo;
  } catch (error) {
    if (window.sessionStorage.getItem(AUTH_CALLBACK_KEY) === callbackKey) {
      window.sessionStorage.removeItem(AUTH_CALLBACK_KEY);
    }
    throw error;
  }
}

export function clearAuthSession() {
  window.sessionStorage.removeItem(AUTH_SESSION_KEY);
  window.sessionStorage.removeItem(AUTH_FLOW_KEY);
  window.sessionStorage.removeItem(AUTH_CALLBACK_KEY);
}

export function logout() {
  if (!isKeycloakAuthEnabled()) {
    return;
  }

  const session = getAuthSession();
  clearAuthSession();

  if (!keycloakConfigComplete()) {
    return;
  }

  const logoutUrl = new URL(`${normalizedIssuer()}/protocol/openid-connect/logout`);
  logoutUrl.search = new URLSearchParams({
    client_id: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    post_logout_redirect_uri: window.location.origin,
    ...(session?.idToken ? { id_token_hint: session.idToken } : {}),
  }).toString();

  window.location.assign(logoutUrl.toString());
}

function assertKeycloakConfigured() {
  if (!keycloakConfigComplete()) {
    throw new Error("Keycloak is niet volledig geconfigureerd.");
  }
}

function normalizedIssuer() {
  return String(import.meta.env.VITE_KEYCLOAK_ISSUER).replace(/\/$/, "");
}

function redirectUriForCurrentOrigin() {
  return import.meta.env.VITE_KEYCLOAK_REDIRECT_URI ?? `${window.location.origin}/auth/callback`;
}

function storedFlow() {
  const rawFlow = window.sessionStorage.getItem(AUTH_FLOW_KEY);
  return rawFlow ? (JSON.parse(rawFlow) as StoredFlow) : null;
}

async function waitForStoredSession() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (getAuthSession()) {
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }

  throw new Error("Aanmelden is al in behandeling, maar er is nog geen sessie ontvangen.");
}

function currentRelativeUrl() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function randomUrlSafe(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  window.crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

async function pkceChallenge(codeVerifier: string) {
  const bytes = new TextEncoder().encode(codeVerifier);
  const digest = await window.crypto.subtle.digest("SHA-256", bytes);
  return base64Url(new Uint8Array(digest));
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeJwtClaims(token: string): TokenClaims {
  const [, payload] = token.split(".");
  if (!payload) {
    return {};
  }

  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const json = window.atob(padded);
  return JSON.parse(json) as TokenClaims;
}

function userFromClaims(claims: TokenClaims): AuthUser {
  const name = claims.name ?? claims.preferred_username ?? claims.email ?? claims.sub ?? "Keycloak gebruiker";
  return {
    id: claims.sub ?? name,
    name,
    roles: rolesFromClaims(claims),
    initials: initialsForName(name),
  };
}

function rolesFromClaims(claims: TokenClaims) {
  const roles = new Set<string>(claims.realm_access?.roles ?? []);
  Object.values(claims.resource_access ?? {}).forEach((resource) => {
    resource.roles?.forEach((role) => roles.add(role));
  });
  return [...roles];
}

function splitRoles(roles: string) {
  return roles
    .split(",")
    .map((role) => role.trim())
    .filter(Boolean);
}

function initialsForName(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "VC";
}
