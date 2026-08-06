# Architectuurbacklog Vernietigingscockpit

Deze backlog vertaalt de architectuurprincipes uit de Review-specificaties naar
kleine features die zelfstandig door Codex kunnen worden opgepakt. De volgorde is
gericht op aantoonbare procesintegriteit voordat verdere UI- of integratiebouw
wordt uitgebreid.

## Sprintdoel

De cockpit groeit van prototype naar architectuurconforme regie-applicatie door
normatieve acties persistent, traceerbaar en via workflowregels af te dwingen.

## Prioriteiten

### VC-001 Workflowtransities afdwingen

**Doel**: statuswijzigingen verlopen alleen via de workflowmodule.

**Architectuurprincipe**: geen impliciete stappen, geen bypasses, vaste volgorde.

**Scope**
- Definieer toegestane transities voor taakuitvoeringen.
- Voeg een centrale `transition` use case toe.
- Registreer actor, event type, oude status en nieuwe status.
- Blokkeer ongeldige transities met een duidelijke fout.

**Acceptatiecriteria**
- Proceseigenaar-akkoord zet status van `wacht_op_proceseigenaar` naar `wacht_op_archivaris`.
- Archivaris-akkoord zet status van `wacht_op_archivaris` naar `goedgekeurd`.
- Terugsturen zet status terug naar `review`.
- Ongeldige transities worden geweigerd.

**Codex prompt**
```text
Implementeer VC-001: voeg een transactionele WorkflowService.transition toe,
gebruik deze vanuit besluitvorming, en voeg gerichte unit tests toe.
```

### VC-002 Audit events insert-only en transactioneel

**Doel**: normatieve acties worden samen met de mutatie vastgelegd.

**Architectuurprincipe**: volledige audit en reproduceerbaarheid.

**Scope**
- Voeg een audit helper toe of veranker auditwrites in workflow/dossier use cases.
- Sla audit events in dezelfde database-transactie op als status- of dossiermutaties.
- Leg actor, rollen, event type, taakuitvoering en payload vast.
- Voorkom applicatieve update/delete-paden op auditdata.

**Acceptatiecriteria**
- Elke accordering schrijft een audit event.
- Elke reviewmutatie schrijft een audit event.
- Audit payload bevat genoeg context voor externe controle.

**Codex prompt**
```text
Implementeer VC-002: maak auditwrites transactioneel voor accorderingen en
reviewmutaties, inclusief tests op geschreven payloads.
```

### VC-003 Rolzuivere besluitvorming

**Doel**: alleen bevoegde rollen kunnen normatieve besluiten nemen.

**Architectuurprincipe**: functiescheiding en rolzuiverheid.

**Scope**
- Voeg role guards/decorators toe.
- Maak proceseigenaar- en archivaris-endpoints rolgebonden.
- Blokkeer dezelfde actor voor opeenvolgende rollen wanneer configured.
- Vervang header-auth later door Keycloak/JWT validatie.

**Acceptatiecriteria**
- Proceseigenaar-endpoint vereist rol `proceseigenaar`.
- Archivaris-endpoint vereist rol `archivaris`.
- Onbevoegde requests krijgen 403.

**Codex prompt**
```text
Implementeer VC-003: voeg role guards toe voor besluitvorming en test de
toegangsregels.
```

### VC-004 Stekkercontract selectie en vernietiging

**Doel**: cockpit communiceert alleen via uniforme stekkercontracten.

**Architectuurprincipe**: centrale regie, decentrale uitvoering.

**Scope**
- Modelleer `Vernietigingskandidaat` als primair uitwisselobject.
- Voeg selectie-start, selectie-status en selectie-resultaat toe aan de stekkerport.
- Voeg vernietiging-start, batch-aanlevering en resultaatpolling toe.
- Leg stekkerversie en correlatie-id vast.

**Acceptatiecriteria**
- Dossierregels worden vanuit kandidaten opgebouwd.
- Geen bronsysteemspecifieke velden zijn verplicht in cockpitlogica.
- Stekkerfouten worden als externe foutstatus vastgelegd.

**Codex prompt**
```text
Implementeer VC-004: breid de stekkerport uit met selectie- en
vernietigingscontracten op kandidaatniveau en pas de services aan.
```

### VC-005 Queuegestuurde uitvoering

**Doel**: lange processen draaien buiten de HTTP request-response flow.

**Architectuurprincipe**: herstartbaarheid, robuustheid en foutisolatie.

**Scope**
- Voeg BullMQ/Redis configuratie toe.
- Start selectie, vernietiging en archivering via jobs.
- Maak job payloads idempotent.
- Registreer jobstatus en fouten in PostgreSQL.

**Acceptatiecriteria**
- HTTP endpoints retourneren `202` met actie-id.
- Worker verwerkt jobs en schrijft status terug.
- Retries leiden niet tot dubbele vernietigingsopdrachten.

**Codex prompt**
```text
Implementeer VC-005: voeg BullMQ queue wiring toe voor uitvoering en polling,
inclusief idempotente job payloads.
```

### VC-006 Verklaring en archivering

**Doel**: een taak is pas afgerond na verklaring en archivering.

**Architectuurprincipe**: bewijsvoering en volledige dossierexport.

**Scope**
- Valideer dossiercompleetheid.
- Genereer verklaring als JSON/PDF.
- Archiveer via OpenZaak-adapter.
- Sla archiveringsreferentie op.

**Acceptatiecriteria**
- Verklaring bevat accorderingen, uitsluitingen en uitvoeringsresultaten.
- Afgeronde taak heeft een archiveringsstatus.
- Export komt aantoonbaar overeen met dossierdata.

**Codex prompt**
```text
Implementeer VC-006: voeg verklaringgeneratie en OpenZaak-adapterinterface toe
met een lokale mock-adapter en tests.
```

## Definition of Ready

- Feature verwijst naar minimaal een architectuurprincipe.
- Scope is kleiner dan drie werkdagen implementatie.
- Acceptatiecriteria zijn testbaar.
- Data- en auditimpact is expliciet.

## Definition of Done

- Build en relevante tests slagen.
- PR bevat architectuurimpact en testbewijs.
- Normatieve mutaties hebben auditdekking.
- Nieuwe configuratie is expliciet gedocumenteerd.
