import assert from "node:assert/strict";
import test from "node:test";

import {
  accessTokenNeedsRefresh,
  requestTokenRefresh,
} from "../src/shared/auth/oidcSession.ts";

test("vernieuwt een access token binnen de veiligheidsmarge", () => {
  const now = 1_000_000;

  assert.equal(accessTokenNeedsRefresh({ expiresAt: now + 30_001 }, now), false);
  assert.equal(accessTokenNeedsRefresh({ expiresAt: now + 30_000 }, now), true);
  assert.equal(accessTokenNeedsRefresh({ expiresAt: now - 1 }, now), true);
});

test("vraagt een nieuw token aan met de publieke client en refresh token", async () => {
  let requestBody = "";
  const fetcher: typeof fetch = async (_input, init) => {
    requestBody = String(init?.body);
    return new Response(
      JSON.stringify({
        access_token: "nieuw-access-token",
        refresh_token: "nieuw-refresh-token",
        expires_in: 120,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const response = await requestTokenRefresh(
    "https://identity.example.nl/token",
    "vernietigingscockpit-ui",
    "huidig-refresh-token",
    fetcher,
  );

  assert.equal(response.access_token, "nieuw-access-token");
  assert.equal(response.refresh_token, "nieuw-refresh-token");
  assert.deepEqual(Object.fromEntries(new URLSearchParams(requestBody)), {
    grant_type: "refresh_token",
    client_id: "vernietigingscockpit-ui",
    refresh_token: "huidig-refresh-token",
  });
});

test("weigert een mislukte tokenvernieuwing", async () => {
  const fetcher: typeof fetch = async () => new Response(null, { status: 401 });

  await assert.rejects(
    requestTokenRefresh(
      "https://identity.example.nl/token",
      "vernietigingscockpit-ui",
      "ongeldig-refresh-token",
      fetcher,
    ),
    /failed with 401/,
  );
});
