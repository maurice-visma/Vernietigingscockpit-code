# ADR 0004: rolautorisatiematrix voor cockpitacties

## Status

Voorgesteld.

## Context

Het bindende Review-ontwerp vereist expliciete rollen, functiescheiding en
server-side blokkering van ongeautoriseerde acties:

- `architectuur/architectuur-cockpit.md`, paragrafen 3, 5.2 en 5.4;
- `architectuur/sequence-diagrammen.md`, kernprocessen 2 tot en met 6;
- `backlog/03-stories/US-014-toegang-proceseigenaar-tot-overzicht.md`;
- `backlog/03-stories/US-016-autorisatie-op-basis-van-extern-iam.md`;
- `backlog/03-stories/US-021-alleen-vernietigen-na-goedkeuringsronde.md`;
- `backlog/03-stories/US-040-specifieke-rm-rollen-voor-risico-activiteiten.md`.

De implementatie valideerde Keycloak-tokens, maar alleen de twee
accorderingsendpoints hadden een rolguard. Selectie, beoordeling, uitvoering,
resultaten en archivering waren voor iedere aangemelde gebruiker bereikbaar.
De UI stuurde bovendien iedere dashboardactie naar de selectiestap.

Het ontwerp noemt een functioneel beheerder voor stekkerconfiguratie,
gebruikers- en rollenbeheer en monitoring. De huidige applicatie bevat daarvoor
nog geen muterende API's. Daarom mag de bestaande rol `beheerder` niet
impliciet als superrol worden behandeld.

## Besluit

De cockpit hanteert voor de bestaande functionaliteit deze matrix:

| Handeling | recordmanager | proceseigenaar | archivaris | beheerder |
| --- | --- | --- | --- | --- |
| Dashboard en taakstatus inzien | ja | ja | ja | ja |
| Taakdefinitie en bestaande stekkerstatus inzien | ja | nee | nee | ja |
| Selectie starten | ja | nee | nee | nee |
| Vernietigingskandidaten inzien | ja | ja | ja | nee |
| Reviewregels wijzigen of beoordeeld markeren | ja | nee | nee | nee |
| Proceseigenaaraccordering | nee | ja | nee | nee |
| Archivarisaccordering | nee | nee | ja | nee |
| Vernietiging starten | ja | nee | nee | nee |
| Resultaten, verklaring, export en archivering | ja | nee | nee | nee |

Aanvullende regels:

1. De API-controller legt voor iedere niet-publieke handeling expliciet
   toegestane rollen vast. Ontbrekende of verkeerde rollen leveren HTTP 403.
2. UI-routes en dashboardacties volgen dezelfde matrix. Dit is alleen
   gebruikersondersteuning; de API blijft de beveiligingsgrens.
3. `beheerder` krijgt alleen rechten op reeds bestaande beheerinzage en geen
   selectie-, accorderings- of vernietigingsrecht.
4. Proceseigenaar en archivaris mogen het dossier inzien dat zij voor hun
   accordering nodig hebben, maar niet de recordmanagerreview wijzigen.
5. Bestaande actor- en functiescheidingscontroles blijven van kracht.

## Gevolgen

- Rechtstreekse API-aanroepen kunnen UI-beperkingen niet omzeilen.
- Accounts zonder cockpitrol zijn wel geauthenticeerd maar hebben geen
  applicatietoegang.
- Het alles-in-een lokale testaccount blijft technisch bruikbaar, maar de vier
  gescheiden rolaccounts zijn nodig om functiescheiding realistisch te testen.
- Toekomstige beheermutaties vereisen een apart ontwerpbesluit en mogen niet
  automatisch onder `beheerder` worden geplaatst.
- Fijnmaziger RM-risicorollen uit US-040 zijn nog niet gedefinieerd in het
  bindende ontwerp. Totdat die bestaan, is `recordmanager` de expliciete rol
  voor bestaande RM-handelingen; `beheerder` erft die rechten niet.

## Verificatie

- Een metadatatest dekt iedere niet-publieke controllerhandeling en de
  bijbehorende rollen.
- Guardtests dekken toegestane, verkeerde en ontbrekende rollen.
- Frontendtests dekken routes en dashboardacties per rol.
- Lokale Keycloak-tests gebruiken vier accounts met ieder exact één
  cockpitrol en controleren zowel toegestane read-only calls als HTTP 403 voor
  rechtstreekse ongeautoriseerde mutaties.
