# ADR 0002: authenticatie faalt gesloten

## Status

Voorgesteld.

## Context

Het bindende Review-ontwerp bepaalt dat:

- centrale IAM-integratie verplicht is (`architectuur/architectuur-cockpit.md`,
  paragraaf 5.2);
- de cockpit identiteit, autorisatie en functiescheiding afdwingt;
- lokale omzeiling van autorisatie niet is toegestaan
  (`backlog/03-stories/US-016-autorisatie-op-basis-van-extern-iam.md`);
- configuratie expliciet en voorspelbaar moet zijn
  (`architectuur/architectuur-cockpit.md`, paragraaf 7).

De technische architectuur kiest Keycloak, OIDC en JWT, maar specificeert niet
hoe een implementatie zich gedraagt wanneer IAM-configuratie ontbreekt. De
implementatie vulde dit impliciet in: zonder `KEYCLOAK_ISSUER` accepteerde de
API automatisch ontwikkelheaders en zonder `VITE_AUTH_MODE` koos de UI de
ontwikkelmodus. Ook was API-audiencevalidatie optioneel.

Dat gedrag is strijdig met het bindende ontwerp: een configuratiefout kon een
lokaal autorisatiepad activeren en een token was niet aantoonbaar voor deze API
bedoeld.

## Besluit

Authenticatieconfiguratie faalt gesloten:

1. De API accepteert `x-user-*`-headers uitsluitend wanneer
   `AUTH_DEV_HEADER_FALLBACK=true` expliciet is ingesteld.
2. Productie vereist een Keycloak issuer, een API-audience en
   `AUTH_DEV_HEADER_FALLBACK=false`. Bij ontbreken start de API niet.
3. Zodra een issuer is ingesteld, is audiencevalidatie verplicht.
4. De UI gebruikt ontwikkelheaders uitsluitend bij
   `VITE_AUTH_MODE=dev`. Een ontbrekende of onbekende waarde activeert de
   Keycloakroute en geeft zonder volledige Keycloakconfiguratie geen toegang.
5. De headerfallback is alleen een ontwikkelhulpmiddel en geen ondersteund
   authenticatiemechanisme voor test-, staging- of productieomgevingen.

Het gezaghebbende functionele en normatieve ontwerp blijft de Review-branch van
`GemeenteArnhem/Vernietigingscockpit`; dit ADR legt uitsluitend vast hoe deze
implementatie dat kader technisch invult.

## Gevolgen

- Lokale ontwikkeling zonder Keycloak vereist voortaan een expliciete
  `AUTH_DEV_HEADER_FALLBACK=true` en `VITE_AUTH_MODE=dev`.
- Omgevingen met Keycloak moeten een audience voor de cockpit-API configureren
  en die audience in access tokens opnemen.
- Ontbrekende configuratie wordt bij API-start zichtbaar in plaats van pas als
  onverwacht runtimegedrag.
- Dit besluit verandert nog niet de sessie-, refresh- en logoutstrategie en ook
  niet de rollenmatrix. Daarvoor zijn afzonderlijke ontwerpbesluiten nodig.

## Verificatie

- Configuratietests bewijzen dat productie zonder issuer, audience of expliciet
  uitgeschakelde fallback weigert te starten.
- Guardtests bewijzen dat ontwikkelheaders zonder expliciete opt-in `401`
  opleveren.
- JWT-validatie ontvangt altijd de geconfigureerde audience.
