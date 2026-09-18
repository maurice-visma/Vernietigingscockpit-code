# ADR 0003: Keycloak-sessievernieuwing in de SPA

## Status

Voorgesteld.

## Context

De cockpit gebruikt een publieke OIDC-client met Authorization Code Flow en
PKCE. ADR 0002 schrijft fail-closed authenticatie en verplichte
audiencevalidatie voor.

De frontend bewaarde het door Keycloak uitgegeven refresh token, maar gebruikte
het niet. Dertig seconden voor het verlopen van een access token verwijderde de
frontend de lokale sessie. Een al geopende workflowpagina bleef daardoor
zichtbaar als aangemeld, terwijl de eerstvolgende API-call zonder bearer token
werd verstuurd. De API weigerde dit terecht met HTTP 401, maar de gebruiker zag
alleen een functionele foutmelding, bijvoorbeeld bij het ophalen van een
selectie.

## Besluit

1. De SPA vernieuwt het access token via het OIDC token endpoint zodra het
   token binnen de veiligheidsmarge van dertig seconden valt.
2. De publieke client gebruikt daarbij alleen `client_id` en het door Keycloak
   uitgegeven refresh token; er wordt geen client secret in de SPA opgenomen.
3. Gelijktijdige API-calls delen hetzelfde lopende refreshverzoek.
4. Nieuwe access-, ID- en refresh tokens vervangen de oude sessiewaarden.
5. Als vernieuwing niet mogelijk is, wordt de lokale sessie fail-closed
   verwijderd en start de normale PKCE-login opnieuw.
6. De API blijft issuer, signature en audience valideren. Developmentheaders
   worden niet als fallback gebruikt.

## Gevolgen

- Een korte access-tokenlevensduur onderbreekt een actieve workflow niet meer.
- Refresh tokens blijven beperkt tot browser-`sessionStorage` en verdwijnen
  bij logout of het sluiten van de browsersessie.
- Intrekking of verlopen van de centrale sessie leidt tot opnieuw aanmelden.
- Productie moet passende access-, refresh- en idle-timeouts in Keycloak
  configureren.

## Verificatie

- Unit-tests dekken de veiligheidsmarge, refresh-aanvraag en foutafhandeling.
- De UI-build en lintcontrole moeten slagen.
- Een lokale E2E-test wacht tot het oorspronkelijke access token binnen de
  veiligheidsmarge valt en start daarna via de UI een selectie. De API moet een
  geauthenticeerde selectiejob vastleggen en kandidaten ophalen.
