# Selectiestart na Keycloak-tokenvernieuwing

Datum: 18 september 2026

Branch: `codex/keycloak-session-refresh`

## Aanleiding

Een ingelogde gebruiker zag bij `selectie ophalen` de melding
`Selectie ophalen kon niet worden gestart.`. De bestaande Keycloak-realm
gebruikt lokaal een access-tokenlevensduur van 60 seconden. De frontend
verwijderde het token al binnen een veiligheidsmarge van 30 seconden, maar een
reeds geopende workflowpagina bleef als aangemeld in beeld. De volgende
API-call bevatte daardoor geen bearer token en werd terecht met HTTP 401
geweigerd. Er werd geen selectiejob aangemaakt.

Een selectie met een vers token slaagde direct. Daarmee zijn stekkerwerking,
rollen, audience en databaseconfiguratie als oorzaak uitgesloten.

## Herstel

De SPA vernieuwt het access token nu binnen de veiligheidsmarge via het OIDC
token endpoint en het bestaande refresh token. De publieke client stuurt geen
client secret. Gelijktijdige calls delen één refreshverzoek. Als vernieuwing
mislukt, wordt de lokale sessie fail-closed verwijderd en start opnieuw de
PKCE-login.

Het ontwerpbesluit staat in
[`ADR 0003`](../adr/0003-keycloak-sessievernieuwing.md).

## E2E-bewijs

De lokale cockpit draaide met:

- UI `http://127.0.0.1:5173`;
- API `http://127.0.0.1:3001`;
- Keycloak `http://127.0.0.1:8180/realms/master`;
- audience `vernietigingscockpit-api`;
- `AUTH_DEV_HEADER_FALLBACK=false`.

Testverloop:

1. Aanmelden via Authorization Code Flow met PKCE.
2. De selectiestap `/taak/2/taakuitvoering/2/selectie` openen.
3. 35 seconden wachten tot het oorspronkelijke access token binnen de
   refreshmarge valt.
4. In de UI `selectie ophalen` uitvoeren.
5. Controleren dat de UI naar Beoordeling navigeert.
6. De selectiejob en kandidaten read-only in PostgreSQL controleren.

Waargenomen resultaat:

- UI navigeerde zonder foutmelding naar Beoordeling;
- selectiejob `d3d0b37e-bc0f-472f-8b83-6587032e6056`;
- actor was de ingelogde Keycloak-gebruiker;
- status `voltooid`;
- twee kandidaten vastgelegd;
- geen foutmelding;
- geen vernietigings- of andere destructieve vervolgstap uitgevoerd.

## Geautomatiseerde controle

- drie sessievernieuwingsunit-tests geslaagd;
- UI-productiebuild geslaagd;
- gerichte ESLint-controle op de gewijzigde bestanden geslaagd;
- `git diff --check` geslaagd.

De volledige bestaande UI-linttaak rapporteert 33 reeds aanwezige fouten in
ongerelateerde componenten. Deze wijziging introduceert daar geen nieuwe
meldingen.
