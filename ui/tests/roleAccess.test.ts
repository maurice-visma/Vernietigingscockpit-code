import assert from "node:assert/strict";
import test from "node:test";

import {
  canAccessCapability,
  workflowRouteForRoles,
} from "../src/shared/auth/roleAccess.ts";

test("scheidt muterende workflowstappen per rol", () => {
  assert.equal(canAccessCapability(["recordmanager"], "selection"), true);
  assert.equal(canAccessCapability(["proceseigenaar"], "selection"), false);
  assert.equal(canAccessCapability(["recordmanager"], "processOwnerApproval"), false);
  assert.equal(canAccessCapability(["proceseigenaar"], "processOwnerApproval"), true);
  assert.equal(canAccessCapability(["archivaris"], "archivistApproval"), true);
  assert.equal(canAccessCapability(["beheerder"], "destruction"), false);
});

test("geeft beheerder alleen toegang tot bestaande beheerinzage", () => {
  assert.equal(canAccessCapability(["beheerder"], "dashboard"), true);
  assert.equal(canAccessCapability(["beheerder"], "taskDefinition"), true);
  assert.equal(canAccessCapability(["beheerder"], "review"), false);
  assert.equal(canAccessCapability(["beheerder"], "results"), false);
});

test("stuurt dashboardacties alleen naar de stap van de actieve rol", () => {
  assert.equal(
    workflowRouteForRoles(["proceseigenaar"], "Accordering PO", "2", "3"),
    "/taak/2/taakuitvoering/3/accordering/proceseigenaar",
  );
  assert.equal(
    workflowRouteForRoles(["recordmanager"], "Accordering PO", "2", "3"),
    null,
  );
  assert.equal(
    workflowRouteForRoles(["archivaris"], "Accordering Archivaris", "2", "3"),
    "/taak/2/taakuitvoering/3/accordering/archivaris",
  );
});

test("weigert accounts zonder cockpitrol", () => {
  assert.equal(canAccessCapability([], "dashboard"), false);
  assert.equal(workflowRouteForRoles([], "Selectie", "2", "3"), null);
});
