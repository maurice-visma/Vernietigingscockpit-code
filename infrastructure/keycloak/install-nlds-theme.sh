#!/usr/bin/env bash
set -euo pipefail

THEME_VERSION="${THEME_VERSION:-v1.4.2}"
THEME_FILE="keycloak-nl-design-system.jar"
THEME_SHA256="${THEME_SHA256:-3adab8c9223127cf3aeb5b566fd9a08bab43bc79d9a0a92ff8a2ea1d2ecb9d35}"
THEME_URL="${THEME_URL:-https://github.com/MinBZK/keycloak-theme/releases/download/${THEME_VERSION}/${THEME_FILE}}"

KEYCLOAK_CONTAINER="${KEYCLOAK_CONTAINER:-keycloak}"
KEYCLOAK_BASE_URL="${KEYCLOAK_BASE_URL:-http://127.0.0.1:8180}"
KEYCLOAK_ADMIN_USER="${KEYCLOAK_ADMIN_USER:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
KEYCLOAK_REALMS="${KEYCLOAK_REALMS:-master vernietigingscockpit}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CACHE_DIR="${SCRIPT_DIR}/.cache"
JAR_PATH="${CACHE_DIR}/${THEME_FILE}"

mkdir -p "${CACHE_DIR}"

if [ ! -f "${JAR_PATH}" ]; then
  curl -fsSL "${THEME_URL}" -o "${JAR_PATH}"
fi

ACTUAL_SHA256="$(shasum -a 256 "${JAR_PATH}" | awk '{print $1}')"
if [ "${ACTUAL_SHA256}" != "${THEME_SHA256}" ]; then
  echo "Theme checksum mismatch for ${JAR_PATH}" >&2
  echo "Expected: ${THEME_SHA256}" >&2
  echo "Actual:   ${ACTUAL_SHA256}" >&2
  exit 1
fi

docker cp "${JAR_PATH}" "${KEYCLOAK_CONTAINER}:/opt/keycloak/providers/${THEME_FILE}"

docker restart "${KEYCLOAK_CONTAINER}" >/dev/null

for attempt in $(seq 1 60); do
  if curl -fsS "${KEYCLOAK_BASE_URL}/realms/master/.well-known/openid-configuration" >/dev/null 2>&1; then
    break
  fi
  if [ "${attempt}" = "60" ]; then
    echo "Keycloak did not become ready at ${KEYCLOAK_BASE_URL}" >&2
    exit 1
  fi
  sleep 2
done

ADMIN_TOKEN="$(
  curl -fsS -X POST "${KEYCLOAK_BASE_URL}/realms/master/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "grant_type=password" \
    --data-urlencode "client_id=admin-cli" \
    --data-urlencode "username=${KEYCLOAK_ADMIN_USER}" \
    --data-urlencode "password=${KEYCLOAK_ADMIN_PASSWORD}" |
    node -pe 'JSON.parse(require("fs").readFileSync(0, "utf8")).access_token'
)"

for REALM in ${KEYCLOAK_REALMS}; do
  REALM_JSON="$(curl -fsS -H "Authorization: Bearer ${ADMIN_TOKEN}" "${KEYCLOAK_BASE_URL}/admin/realms/${REALM}")"

  UPDATED_REALM_JSON="$(
    REALM_JSON="${REALM_JSON}" node <<'NODE'
const realm = JSON.parse(process.env.REALM_JSON);
realm.loginTheme = "nl-design-system";
realm.accountTheme = "nl-design-system";
realm.emailTheme = "nl-design-system";
realm.adminTheme = "nl-design-system";
process.stdout.write(JSON.stringify(realm));
NODE
  )"

  curl -fsS -X PUT "${KEYCLOAK_BASE_URL}/admin/realms/${REALM}" \
    -H "Authorization: Bearer ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "${UPDATED_REALM_JSON}" >/dev/null

  echo "Applied nl-design-system theme to realm ${REALM}"
done

echo "Installed ${THEME_FILE} ${THEME_VERSION} in ${KEYCLOAK_CONTAINER}"
