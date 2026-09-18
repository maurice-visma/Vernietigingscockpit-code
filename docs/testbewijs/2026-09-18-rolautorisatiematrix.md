# E2E-testbewijs rolautorisatiematrix

Datum: 18 september 2026

Branch: `codex/role-authorization`

Base: `codex/keycloak-session-refresh` (open PR 5)

## Ontwerpgrondslag

De matrix is afgeleid uit de bindende Review-branch van
`GemeenteArnhem/Vernietigingscockpit`:

- `architectuur/architectuur-cockpit.md`: expliciete rollen,
  functiescheiding, vaste workflow en alleen bevoegde besluiten;
- `architectuur/sequence-diagrammen.md`: recordmanager start selectie,
  beoordeelt en start uitvoering; proceseigenaar en archivaris accorderen
  opeenvolgend; functioneel beheer beperkt zich tot beheer en monitoring;
- `US-014`: proceseigenaar heeft dossierinzage zonder reviewmutaties;
- `US-016`: autorisatie wordt consistent in UI en API toegepast;
- `US-021`: geen uitvoering zonder volledige goedkeuringsronde;
- `US-040`: algemene beheerrechten geven geen risicovolle RM-rechten.

Het technische besluit en de volledige matrix staan in
[`ADR 0004`](../adr/0004-rolautorisatiematrix.md).

## Geautomatiseerde verificatie

- API: 6 suites, 33 tests geslaagd.
- Route-metadatatest dekt alle 13 niet-publieke controllerhandelingen.
- Frontend: 8 tests geslaagd, inclusief claimcombinatie, sessievernieuwing en
  rolroutes.
- API- en UI-productiebuild geslaagd.
- Gerichte ESLint-controle op alle gewijzigde UI-bestanden geslaagd.
- `git diff --check` geslaagd.

## Lokale Keycloak- en API-verificatie

De bestaande vier lokale accounts hebben ieder exact één cockpitrol. Voor de
API-proef is tijdelijk een public Direct Grant-client met audience
`vernietigingscockpit-api` gebruikt. De client en een tijdelijke gebruiker
zonder cockpitrol zijn direct na de test verwijderd. Tokens en wachtwoorden
zijn niet gelogd.

| Scenario | Resultaat |
| --- | --- |
| Recordmanager leest resultaatregels | HTTP 200 |
| Proceseigenaar leest reviewdossier | HTTP 200 |
| Proceseigenaar probeert reviewregel te wijzigen | HTTP 403 |
| Archivaris probeert selectie te starten | HTTP 403 |
| Archivaris probeert proceseigenaaraccordering | HTTP 403 |
| Beheerder leest stekkerstatus | HTTP 200 |
| Beheerder probeert reviewdossier te lezen | HTTP 403 |
| Geldig token zonder cockpitrol leest taakstatus | HTTP 403 |
| Request zonder bearer token | HTTP 401 |

Alle muterende negatieve tests zijn door de guard gestopt voordat een service
of workflowmutatie werd uitgevoerd. Er is niets vernietigd of geaccordeerd.

## UI-verificatie

De UI-productiebuild en capabilitytests bewijzen:

- recordmanager ziet alleen RM-workflowacties;
- proceseigenaar wordt naar de eigen accorderingsroute gestuurd;
- archivaris wordt naar de eigen accorderingsroute gestuurd;
- beheerder ziet bestaande taak-/stekkerinzage maar geen workflowmutaties;
- een directe route zonder passende rol toont `Geen toegang`;
- een account zonder cockpitrol krijgt geen dashboardtoegang.

Een geautomatiseerde browserlogin met de rolaccounts is bewust niet uitgevoerd:
de browserautomatisering heeft geen toegang tot het afgeschermde lokale
credentialbestand zonder het wachtwoord aan de tool door te geven. De normale
Keycloak-login staat lokaal klaar voor een handmatige accountwissel. De API-test
met echte tokens is de autoritatieve server-side beveiligingscontrole.

## Resterende beperkingen

- De huidige UI bevat nog geen echte IAM-beheer- of monitoringpagina. Deze PR
  verzint die niet en maakt `beheerder` niet tot superrol.
- De accorderingspagina's bevatten bestaande lokale UI-interactie die nog niet
  alle backendmutaties aanroept. De aanwezige backendendpoints zijn wel
  rolgebonden en de bestaande functiescheidingscontrole blijft intact.
- Fijnmazige risicorollen binnen recordmanagement uit US-040 zijn nog niet
  normatief benoemd. Tot die keuze is `recordmanager` de rol voor bestaande
  RM-acties en erft `beheerder` die rechten niet.
