# Vernietigingscockpit-code
Codebase voor de vernietigingscockpit, monorepo frontend en backend

## Authenticatieontwerp

De normatieve bron is de
[`Review/architectuur`](https://github.com/GemeenteArnhem/Vernietigingscockpit/tree/Review/architectuur)-documentatie.
Deze implementatie werkt de fail-closed configuratie uit in
[`docs/adr/0002-authenticatie-fail-closed.md`](docs/adr/0002-authenticatie-fail-closed.md).

## Lokale authenticatie

De API ondersteunt Keycloak/OIDC JWT-validatie via:

- `KEYCLOAK_ISSUER`, bijvoorbeeld `http://localhost:8180/realms/master`
- `KEYCLOAK_JWKS_URI`, optioneel; standaard `${KEYCLOAK_ISSUER}/protocol/openid-connect/certs`
- `KEYCLOAK_AUDIENCE`, verplicht zodra `KEYCLOAK_ISSUER` is geconfigureerd
- `AUTH_DEV_HEADER_FALLBACK=true`, om lokaal tijdelijk `x-user-id`, `x-user-name`
  en `x-user-roles` te blijven gebruiken

De API accepteert development headers uitsluitend wanneer
`AUTH_DEV_HEADER_FALLBACK=true` expliciet is ingesteld. Zonder deze opt-in
weigert de API requests zonder `Authorization: Bearer <token>`. In productie
zijn `KEYCLOAK_ISSUER`, `KEYCLOAK_AUDIENCE` en
`AUTH_DEV_HEADER_FALLBACK=false` verplicht; bij ontbreken start de API niet.

De frontend gebruikt alleen na een expliciete keuze development headers, zodat
lokaal ontwikkelen zonder Keycloak mogelijk blijft:

- `VITE_AUTH_MODE=dev`; stuurt `x-user-id`, `x-user-name` en
  `x-user-roles` naar de API
- `VITE_DEV_USER_ID`, optioneel; standaard `dev-user`
- `VITE_DEV_USER_NAME`, optioneel; standaard `Lokale ontwikkelaar`
- `VITE_DEV_USER_ROLES`, optioneel; standaard `beheerder`

Voor Keycloak/OIDC gebruikt de frontend Authorization Code Flow met PKCE:

- `VITE_AUTH_MODE=keycloak`
- `VITE_KEYCLOAK_ISSUER`, bijvoorbeeld `http://localhost:8180/realms/master`
- `VITE_KEYCLOAK_CLIENT_ID`, public SPA-client zonder client secret
- `VITE_KEYCLOAK_REDIRECT_URI`, optioneel; standaard
  `http://localhost:5173/auth/callback`
- `VITE_KEYCLOAK_SCOPE`, optioneel; standaard `openid profile email`

Configureer in Keycloak een public client met Standard flow en PKCE `S256`.
Voeg `http://localhost:5173/auth/callback` toe als valid redirect URI en
`http://localhost:5173` als web origin. Configureer daarnaast een audience
mapper zodat het access token `vernietigingscockpit-api` in de `aud`-claim
bevat. In Keycloak-modus stuurt de UI
`Authorization: Bearer <access_token>` naar de API.

De UI vernieuwt een access token dertig seconden voor afloop via het OIDC token
endpoint en het refresh token van de publieke client. Bij een verlopen of
ingetrokken refreshsessie wordt de lokale sessie verwijderd en start de
PKCE-login opnieuw; er wordt niet teruggevallen op developmentheaders. Zie
[`docs/adr/0003-keycloak-sessievernieuwing.md`](docs/adr/0003-keycloak-sessievernieuwing.md).

Lokale smoke test met de meegeleverde Keycloak-container:

1. Start de API met:
   `PORT=3001 DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5434/vernietigingscockpit KEYCLOAK_ISSUER=http://127.0.0.1:8180/realms/master KEYCLOAK_AUDIENCE=vernietigingscockpit-api AUTH_DEV_HEADER_FALLBACK=false npm run api:dev`
2. Start de UI met:
   `VITE_API_BASE_URL=http://127.0.0.1:3001/v1 VITE_AUTH_MODE=keycloak VITE_KEYCLOAK_ISSUER=http://127.0.0.1:8180/realms/master VITE_KEYCLOAK_CLIENT_ID=vernietigingscockpit-ui VITE_KEYCLOAK_REDIRECT_URI=http://127.0.0.1:5173/auth/callback npm run dev -- --host 127.0.0.1 --port 5173`
3. Open `http://127.0.0.1:5173/dashboard` en log in via Keycloak.

Voor de lokale testomgeving kan een public client `vernietigingscockpit-ui` en
testgebruiker `testgebruiker` met wachtwoord `Test123!` worden aangemaakt. Geef
deze gebruiker de rollen `recordmanager`, `proceseigenaar`, `archivaris` en
`beheerder` om de volledige workflow te testen.

## Keycloak NL Design System theme

De lokale Keycloak kan het NL Design System theme van
[`MinBZK/keycloak-theme`](https://github.com/MinBZK/keycloak-theme) gebruiken.
Het script downloadt de officiële release-jar, controleert de sha256, kopieert
de jar naar `/opt/keycloak/providers/`, herstart Keycloak en zet de realms
`master` en `vernietigingscockpit` op theme `nl-design-system`.

```bash
bash infrastructure/keycloak/install-nlds-theme.sh
```

Standaarden:

- theme release: `v1.4.2`
- jar: `keycloak-nl-design-system.jar`
- Keycloak URL: `http://127.0.0.1:8180`

Na installatie toont `http://127.0.0.1:5173/dashboard` bij inloggen de
Keycloak-loginpagina in NL Design System-stijl.
