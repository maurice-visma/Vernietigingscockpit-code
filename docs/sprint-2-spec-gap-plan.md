# Sprint 2 Plan - Spec-gaten dichten

## Sprintdoel

De Vernietigingscockpit maakt normatieve besluitvorming aantoonbaar veilig:
alleen bevoegde rollen kunnen besluiten nemen, dossiermutaties zijn
auditbaar, en de cockpit krijgt een eerste uniforme contractgrens richting
stekkers. De sprint sluit aan op de Review-architectuur, DON/NeRDS-principes
voor vastgelegde architectuurkeuzes, security by design en API-first
integratie.

## Uitgangssituatie

Sprint 1 heeft de basis gelegd:

- workflowtransities lopen via `WorkflowService.transition`;
- accorderingen schrijven auditcontext binnen een database-transactie;
- `audit_events` is via database-triggers insert-only gemaakt;
- er is een geprioriteerde architectuurbacklog en PR-stack.

De grootste resterende gaten met de specs:

- rollen en functiescheiding worden nog niet afgedwongen;
- reviewmutaties schrijven nog geen audit-events;
- stekkers hebben nog geen selectie-/vernietigingscontract;
- lange processen worden nog niet via queue/workers verwerkt;
- verklaring en OpenZaak-archivering zijn nog stubs;
- configuratieversies, stekkerversies en correlation-id's worden nog niet vastgelegd.

## Sprintscope

### Must have

1. VC-003 Rolzuivere besluitvorming
2. VC-002b Audit voor reviewmutaties
3. VC-004a Stekkercontract voor selectie op kandidaatniveau

### Should have

4. VC-005a Queue-basis voor selectie ophalen
5. VC-007 Configuratie- en stekkerversie vastleggen

### Could have

6. VC-006a Verklaring als controleerbare JSON-export

### Buiten scope

- Volledige Keycloak/OIDC-loginflow in de UI.
- Productieklare OpenZaak-integratie.
- Volledige BullMQ-verwerking voor vernietiging en archivering.
- PDF-opmaak van de vernietigingsverklaring.

## Features

### VC-003 Rolzuivere besluitvorming

**Doel**: normatieve besluiten kunnen alleen door bevoegde rollen worden genomen.

**Spec-eisen**
- Identiteit en autorisatie afdwingen.
- Rollen expliciet onderscheiden.
- Functiescheiding waarborgen.
- Workflowstappen niet kunnen overslaan.

**Scope**
- Voeg `@Roles(...)` decorator toe.
- Voeg `RolesGuard` toe naast de bestaande `AuthGuard`.
- Bescherm accorderingsendpoints:
  - `proceseigenaar` vereist rol `proceseigenaar`;
  - `archivaris` vereist rol `archivaris`.
- Voeg optionele functiescheidingscontrole toe: dezelfde actor mag niet zowel
  proceseigenaar- als archivarisakkoord voor dezelfde taakuitvoering vastleggen.
- Leg geweigerde normatieve poging vast als technisch audit/security event,
  zonder de workflowstatus te wijzigen.

**Acceptatiecriteria**
- Request zonder juiste rol krijgt `403`.
- Proceseigenaar kan alleen PO-accordering vastleggen.
- Archivaris kan alleen finale accordering vastleggen.
- Dezelfde actor kan, als functiescheiding aanstaat, geen tweede rol uitvoeren.
- Tests bewijzen toegestane en geweigerde paden.

**Codex prompt**
```text
Implementeer VC-003: voeg Roles decorator en RolesGuard toe, bescherm de
besluitvormingsendpoints, voeg functiescheidingscontrole toe op basis van
audit_events, en test 200/403-paden.
```

**Demo**
- Doe een PUT op proceseigenaar met `x-user-roles: recordmanager` en toon `403`.
- Doe dezelfde PUT met `x-user-roles: proceseigenaar` en toon workflow + audit.

### VC-002b Audit voor reviewmutaties

**Doel**: uitsluitingen, toelichtingen en markeringen zijn juridisch herleidbaar.

**Spec-eisen**
- Uitsluitingen met toelichting vastleggen.
- Alle wijzigingen versioneren of historisch inzichtelijk maken.
- Auditinformatie zonder aanvullende interpretatie controleerbaar maken.

**Scope**
- Maak `DossierService.updateReviewregel` transactioneel.
- Schrijf audit event bij:
  - statuswijziging;
  - uitzonderingsreden;
  - toelichting;
  - markeren als beoordeeld.
- Voeg actor toe via `@CurrentUser()` in `DossierController`.
- Leg oude en nieuwe waarden vast in auditpayload.
- Valideer dat uitsluiting niet zonder toelichting/reden kan worden opgeslagen
  wanneer de status uitsluiting impliceert.

**Acceptatiecriteria**
- Elke review-PATCH schrijft exact een audit event met oude en nieuwe waarden.
- Bulk-markering schrijft een audit event met aantallen en ids.
- Ongeldige uitsluiting zonder toelichting wordt geweigerd.
- Tests tonen dat database-update en auditwrite in dezelfde transactie zitten.

**Codex prompt**
```text
Implementeer VC-002b: maak reviewmutaties transactioneel, injecteer CurrentUser
in DossierController, schrijf audit_events met oude/nieuwe waarden, en voeg
tests toe voor PATCH en bulk markeer-beoordeeld.
```

**Demo**
- Pas een reviewregel aan.
- Query `audit_events` en toon actor, event type, oude waarde en nieuwe waarde.

### VC-004a Stekkercontract voor selectie op kandidaatniveau

**Doel**: de cockpit bepaalt geen selectie, maar verwerkt uniforme
vernietigingskandidaten vanuit stekkers.

**Spec-eisen**
- Cockpit communiceert uitsluitend met stekkers.
- Stekker bepaalt vernietigingskandidaten.
- ADR 001: vernietigingskandidaat is primair uitwisselobject.
- Stekkerversies parallel kunnen ondersteunen.

**Scope**
- Breid `StekkerClient` uit met:
  - `startSelectie(context, request)`;
  - `haalSelectieStatusOp(selectieId)`;
  - `haalVernietigingskandidatenOp(selectieId, pageToken?)`.
- Voeg types toe:
  - `Vernietigingskandidaat`;
  - `SelectieStartResponse`;
  - `SelectieStatusResponse`;
  - `StekkerVersie`.
- Maak een lokale `MockStekkerClient` die kandidaten uit seed/mockdata oplevert.
- Sla `selectieId`, `stekkerId`, `stekkerVersie`, `peildatum` en
  `correlationId` op in dossiermetadata of een nieuwe selectietabel.
- Laat `startSelectie` niet zelf selecteren, maar uitsluitend stekkerresultaten
  verwerken.

**Acceptatiecriteria**
- `POST /selectie` retourneert een actie met `selectieId` en `correlationId`.
- Kandidaten worden als kandidaatmodel verwerkt, niet als bronsysteemobject.
- Dossiermetadata bevat stekkerversie en selectiecontext.
- Tests bewijzen dat cockpitdata uit de stekkerpoort komt.

**Codex prompt**
```text
Implementeer VC-004a: breid de stekkerport uit met selectiecontracten op
Vernietigingskandidaat-niveau, voeg een MockStekkerClient toe, leg
selectiecontext en stekkerversie vast, en test dat POST /selectie kandidaten via
de port verwerkt.
```

**Demo**
- Start selectie.
- Toon response met `selectieId` en `correlationId`.
- Toon dat reviewregels ontstaan uit `Vernietigingskandidaat`.

### VC-005a Queue-basis voor selectie ophalen

**Doel**: selectie ophalen is asynchroon en herstartbaar voorbereid.

**Spec-eisen**
- Lange processen via queue.
- API en uitvoering ontkoppelen.
- Herstartbaarheid en foutisolatie.

**Scope**
- Voeg BullMQ en Redis-configuratie toe.
- Maak een `selectie` queue.
- Laat `POST /selectie` een job enqueue-en.
- Worker verwerkt selectie via `StekkerClient`.
- Leg jobstatus vast in PostgreSQL.
- Maak job-id idempotent op `taakuitvoeringId + stekkerId + peildatum`.

**Acceptatiecriteria**
- API retourneert `202` zonder selectie synchroon te verwerken.
- Worker kan selectie verwerken en status terugschrijven.
- Herhaalde start met dezelfde input maakt geen dubbele actieve job.
- Tests dekken queue-adapter met een fake queue.

**Codex prompt**
```text
Implementeer VC-005a: voeg BullMQ queue wiring toe voor selectie ophalen, maak
een queue-adapterpoort zodat tests zonder Redis draaien, schrijf jobstatus naar
PostgreSQL, en maak de selectie-start idempotent.
```

**Demo**
- Start selectie en toon `202`.
- Toon jobstatus in database.
- Toon workerlog of testfake die verwerking afrondt.

### VC-007 Configuratie- en stekkerversie vastleggen

**Doel**: historische processen blijven reproduceerbaar.

**Spec-eisen**
- Configuratieversies expliciet vastleggen.
- Stekkerversies parallel ondersteunen.
- Versieinformatie vastleggen in dossiers.
- Geen verborgen configuratie.

**Scope**
- Voeg tabellen toe voor `stekker_configuraties` en `taak_stekker_configuraties`.
- Leg endpoint, stekkerId, versie, parameters en actief-vanaf vast.
- Koppel taakuitvoering aan configuratieversie.
- Toon configuratieversie in stekkeroverzicht/API-response.

**Acceptatiecriteria**
- Iedere selectie heeft een vastgelegde configuratieversie.
- Stekkerlijst bevat versie en config-id.
- Oude taakuitvoering blijft naar oude configuratie verwijzen.

**Codex prompt**
```text
Implementeer VC-007: voeg stekkerconfiguratie-tabellen toe, koppel
taakuitvoeringen aan configuratieversies, breid stekkerresponses uit met
configuratieId en versie, en test historische reproduceerbaarheid.
```

**Demo**
- Toon stekkerconfiguratie in API.
- Toon dat selectiecontext dezelfde configuratieId opslaat.

### VC-006a Verklaring als controleerbare JSON-export

**Doel**: het proces kan aantoonbaar worden afgerond met een verklaring.

**Spec-eisen**
- Verklaring bevat accorderingen en uitvoeringsresultaten.
- Export komt overeen met dossier.
- Proces is zonder verklaring niet afgerond.

**Scope**
- Maak `VerklaringService`.
- Genereer JSON-verklaring uit dossier, audit-events en resultaten.
- Voeg dossiercompleetheidsvalidatie toe.
- Laat `GET /verklaring` echte dossierdata teruggeven in plaats van stub.
- OpenZaak blijft mock/adapterinterface in deze sprint.

**Acceptatiecriteria**
- Verklaring bevat taak, selectiecontext, accorderingen, uitsluitingen,
  resultaten en auditreferenties.
- Geen verklaring bij ontbrekende finale accordering.
- Tests bewijzen dat exportdata uit dossier/audit komt.

**Codex prompt**
```text
Implementeer VC-006a: voeg een VerklaringService toe die een JSON-verklaring uit
dossier, audit_events en uitvoeringsresultaten opbouwt, valideer
dossiercompleetheid, en vervang de stub in GET /verklaring.
```

**Demo**
- Vraag verklaring op voor een taak zonder finale accordering en toon blokkade.
- Rond accordering af en toon de gegenereerde JSON-verklaring.

## Uitvoeringsvolgorde

De sprint wordt uitgevoerd als korte, stapelbare slices in plaats van als
dagplanning:

1. Rolzuiverheid voor normatieve endpoints.
2. Audit op reviewmutaties en bulkacties.
3. Stekkercontract en selectiecontext.
4. Queue/configuratie hardening zodra de contractgrens staat.
5. Verklaring/export wanneer besluitvorming en dossier compleet genoeg zijn.

## PR-slices

### PR A - Role guards en functiescheiding

**Branch**: `codex-role-guards`

**Bevat**
- `@Roles`, `RolesGuard`.
- Beschermde accorderingsendpoints.
- Functiescheidingscontrole.
- Tests.

### PR B - Reviewmutaties met audit

**Branch**: `codex-review-audit`

**Bevat**
- Transactionele reviewmutaties.
- Audit events met oude/nieuwe waarden.
- Tests voor PATCH en bulkacties.

### PR C - Stekkerselectiecontract

**Branch**: `codex-stekker-selectie-contract`

**Bevat**
- Kandidaattypes en stekkerport.
- MockStekkerClient.
- Selectiecontext met versie/correlation-id.
- Tests.

### PR D - Queue/configuratie hardening

**Branch**: `codex-selectie-queue-config`

**Bevat**
- Queue-adapter of configuratieversies, afhankelijk van voortgang.
- Database-migraties.
- Tests en demo-uitleg.

## Definition of Done

- `npm run api:test` slaagt.
- `npm run api:build` slaagt.
- `npm run ui:build` slaagt als UI of API contract voor UI wijzigt.
- Elk normatief pad heeft testdekking voor succes en weigering.
- Elke mutatie met juridische betekenis schrijft audit.
- Nieuwe tabellen/migraties zijn terug te herleiden naar spec-eisen.
- PR-beschrijving bevat:
  - welke spec-eis wordt gedicht;
  - architectuurimpact;
  - testbewijs;
  - resterend risico.

## Sprintreview-opzet

1. Toon beginstand: workflow/audit basis aanwezig, overige gaten open.
2. Demo rolweigering en roltoestemming.
3. Demo reviewmutatie met auditpayload.
4. Demo selectie via stekkercontract en kandidaatmodel.
5. Toon resterende roadmap: queue volledig, vernietiging batches,
   OpenZaak-archivering, PDF-verklaring.

## Risico's

- **Keycloak-integratie kan groter blijken dan verwacht**: begin met role guard
  op bestaande usercontext en maak Keycloak een aparte hardening-PR.
- **BullMQ kan testcomplexiteit toevoegen**: introduceer eerst een queue-port en
  fake adapter.
- **Stekkercontract kan afwijken van toekomstige externe specs**: houd contract
  additief en documenteer als ADR.
- **Auditpayload kan te mager blijven voor toezicht**: review payloads met
  architect/recordmanager voordat PR wordt gemerged.

## Verwachte uitkomst

Na deze sprint zijn de belangrijkste normatieve gaten gedicht:

- bevoegdheid wordt afgedwongen;
- reviewbesluiten zijn herleidbaar;
- selectie loopt via een uniforme stekkergrens;
- stekkerversie en selectiecontext zijn vastgelegd;
- de route naar asynchrone verwerking en verklaring/archivering is technisch
  voorbereid.
