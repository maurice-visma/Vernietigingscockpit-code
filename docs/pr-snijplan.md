# PR-snijplan

Dit snijplan maakt de backlog uitvoerbaar als reviewbare PR's. De PR's zijn
bewust gestapeld: iedere PR levert afzonderlijke waarde, maar samen vormen ze de
route naar architectuurconformiteit.

## PR 1 - Architectuurbacklog en uitvoeringsplan

**Branch**: `codex/architectuur-backlog`

**Inhoud**
- Architectuurbacklog met Codex-ready features.
- PR-snijplan.
- Demo-script voor sprintreview.

**Reviewfocus**
- Klopt de prioritering met de architectuurprincipes?
- Zijn de features klein genoeg om door Codex zelfstandig op te pakken?

## PR 2 - Workflowtransities en auditbasis

**Branch**: `codex/workflow-audit-basis`

**Inhoud**
- Centrale workflowtransities.
- Transactionele database-helper.
- Persistente accorderingen.
- Audit event bij accordering.

**Reviewfocus**
- Worden ongeldige processtappen geblokkeerd?
- Is de auditpayload voldoende voor verantwoording?

## PR 3 - Sprintreview en demo

**Branch**: `codex/sprintreview-demo`

**Inhoud**
- Sprintreview-presentatie.
- Demo-script gekoppeld aan backlog en implementatie.
- Samenvatting van bereikte architectuurfit.

**Reviewfocus**
- Is de review begrijpelijk voor product owner, architect en ontwikkelteam?
- Laat de demo het verschil tussen prototype en geborgde workflow zien?

## Vervolg-PR's

Na deze stack zijn de eerstvolgende implementatie-PR's:

- `codex/role-guards`: rolzuivere besluitvorming.
- `codex/stekker-contract`: selectie- en vernietigingscontract op kandidaatniveau.
- `codex/queue-uitvoering`: BullMQ/Redis voor lange processen.
- `codex/verklaring-archivering`: verklaringgeneratie en OpenZaak-adapter.
