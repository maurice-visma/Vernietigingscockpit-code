# Vernietigingscockpit-code
Codebase voor de vernietigingscockpit, monorepo frontend en backend

## Lokale authenticatie

De API ondersteunt Keycloak/OIDC JWT-validatie via:

- `KEYCLOAK_ISSUER`, bijvoorbeeld `http://localhost:8180/realms/master`
- `KEYCLOAK_JWKS_URI`, optioneel; standaard `${KEYCLOAK_ISSUER}/protocol/openid-connect/certs`
- `KEYCLOAK_AUDIENCE`, optioneel wanneer audience-validatie nodig is
- `AUTH_DEV_HEADER_FALLBACK=true`, om lokaal tijdelijk `x-user-id`, `x-user-name`
  en `x-user-roles` te blijven gebruiken

Zet `AUTH_DEV_HEADER_FALLBACK=false` in combinatie met `KEYCLOAK_ISSUER` om
requests zonder `Authorization: Bearer <token>` te weigeren.
