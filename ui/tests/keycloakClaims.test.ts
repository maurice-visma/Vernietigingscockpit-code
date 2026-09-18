import assert from "node:assert/strict";
import test from "node:test";

import { claimsFromTokens } from "../src/shared/auth/keycloakClaims.ts";

function token(claims: object) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode(claims)}.`;
}

test("combineert identiteit uit het ID-token met rollen uit het access-token", () => {
  const claims = claimsFromTokens(
    token({ realm_access: { roles: ["recordmanager"] } }),
    token({ sub: "rosa", name: "Rosa Recordmanager" }),
  );

  assert.equal(claims.name, "Rosa Recordmanager");
  assert.deepEqual(claims.realm_access?.roles, ["recordmanager"]);
});
