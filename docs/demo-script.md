# Demo-script Sprintreview

## Doelgroep

Product owner, architect, recordmanager, proceseigenaar, archivaris en
ontwikkelteam.

## Demoverhaal

De sprint laat zien hoe de cockpit verschuift van schermprototype naar
architectuurconforme regie-applicatie. De nadruk ligt op traceerbare
besluitvorming en een uitvoerbare backlog.

## Demo 1 - Architectuurbacklog

1. Open `docs/architectuur-backlog.md`.
2. Toon dat elke feature gekoppeld is aan een architectuurprincipe.
3. Laat zien dat iedere feature een Codex prompt en acceptatiecriteria bevat.

**Kernboodschap**: de vervolgstappen zijn klein, toetsbaar en direct uitvoerbaar.

## Demo 2 - Workflow en audit

1. Start de API-tests of build.
2. Toon de centrale workflowtransitie in `WorkflowService`.
3. Toon dat accordering niet meer alleen een response is, maar persistent wordt
   vastgelegd.
4. Toon het audit event met oude status, nieuwe status, rol, actor en toelichting.

**Kernboodschap**: normatieve besluitvorming krijgt een controleerbare basis.

## Demo 3 - Sprintreview presentatie

1. Open de sprintreview-presentatie.
2. Loop door de fit/gap, backlog, PR-stack en demoresultaten.
3. Sluit af met de voorgestelde volgende sprint.

**Kernboodschap**: de cockpit sluit beter aan op de architectuurprincipes, maar
de grootste resterende risico's zijn rolzuiverheid, stekkercontracten en queues.

## Verwachte vragen

**Is dit al productiegeschikt?**
Nee. De sprint zet de basis neer, maar Keycloak, role guards, stekkercontracten
en queueverwerking zijn nog vervolgfeatures.

**Waarom eerst workflow/audit?**
Omdat alle verdere procesfunctionaliteit daarop leunt. Zonder transities en
audit is de cockpit niet aantoonbaar normatief.

**Waarom nog geen microservices?**
De specificatie kiest zelf voor een modulaire monoliet in de MVP-fase. Dat past
bij de sterke samenhang tussen workflow, dossier en besluitvorming.
