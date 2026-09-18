# Keycloak E2E-testbewijs PR 4

Datum: 18 september 2026

Branch: `codex/auth-fail-closed`

Doel: aantonen dat de fail-closed authenticatie uit ADR 0002 in een lokale,
echte Keycloak-stroom werkt. De test is read-only uitgevoerd; er zijn geen
vernietigingsacties gestart of bevestigd.

## Testomgeving

| Component | Versie of adres |
| --- | --- |
| Node.js | 24.14.0 |
| Keycloak | 24.0.5, development mode |
| PostgreSQL | 16-alpine |
| UI | `http://127.0.0.1:5173` |
| API | `http://127.0.0.1:3001` |
| Keycloak | `http://127.0.0.1:8180` |
| Database | `127.0.0.1:5434` |

De SPA is als publieke OIDC-client geconfigureerd. De Authorization Code Flow
gebruikt PKCE met `S256`, de redirect-URI is
`http://127.0.0.1:5173/auth/callback` en de API verwacht:

- issuer `http://127.0.0.1:8180/realms/master`;
- audience `vernietigingscockpit-api`;
- `AUTH_DEV_HEADER_FALLBACK=false`.

De lokale Keycloak-client heeft een audience mapper voor
`vernietigingscockpit-api`. Er zijn geen client secrets in de applicatie of
dit verslag opgenomen.

## Resultaten

| Scenario | Verwacht | Waargenomen |
| --- | --- | --- |
| UI, discovery endpoint en API-health bereikbaar | HTTP 200 | Geslaagd |
| Beveiligde API-call zonder `Authorization` | HTTP 401 | Geslaagd |
| Alleen gespoofte `x-user-*` headers met fallback uit | HTTP 401 | Geslaagd |
| Login starten vanuit dashboard | Redirect naar Keycloak met code flow en PKCE S256 | Geslaagd |
| Inloggen met lokaal testaccount | Callback met authorization code, daarna dashboard | Geslaagd |
| Beveiligd resultaat via UI laden | Bearer-token wordt geaccepteerd en gegevens worden getoond | Geslaagd; vijf resultaatregels geladen |
| Token zonder vereiste audience | HTTP 401 | Geslaagd na correctie in deze PR |
| Token met audiences `andere-api,account` | HTTP 401 | Geslaagd |
| Uitloggen vanuit de UI | Keycloak logout en terug naar login-required scherm | Geslaagd |
| Opnieuw inloggen na logout | Keycloak vraagt opnieuw om credentials | Geslaagd |

## Bevinding en correctie

Een geldig ondertekend token van dezelfde issuer zonder de vereiste audience
leidde aanvankelijk tot HTTP 500. De fout van `jose.jwtVerify` wordt nu
afgevangen en omgezet naar `UnauthorizedException`, waardoor ontbrekende,
verkeerde of verlopen claims als HTTP 401 worden behandeld. Hiervoor zijn
unit-tests toegevoegd die zowel issuer/audience-validatie als de 401-mapping
controleren.

## Aanvullende observaties

De lokale realm gebruikt een access-tokenlevensduur van 60 seconden. De UI
houdt een veiligheidsmarge van 30 seconden aan, waardoor tijdens de langere
tests opnieuw authenticeren nodig was. Zolang de centrale Keycloak-sessie nog
bestond, verliep dit zonder opnieuw credentials in te voeren. Na expliciete
logout vroeg Keycloak wel opnieuw om credentials.

Deze lokale test bewijst niet de productie- of stagingconfiguratie, TLS,
sleutelrotatie onder belasting of de inrichting van productiegebruikers en
rollen. Die punten horen bij deployment- en acceptatievalidatie.

## Geautomatiseerde verificatie

- API-tests: 5 suites, 19 tests geslaagd.
- API-build: geslaagd.
- UI-build: geslaagd.
- ESLint voor de Keycloak-authmodule: geslaagd.
- `git diff --check`: geslaagd.
