type Environment = Record<string, unknown>;

export function validateEnvironment(environment: Environment): Environment {
  const nodeEnvironment = stringValue(environment.NODE_ENV) ?? 'development';
  const devHeaderFallback = stringValue(environment.AUTH_DEV_HEADER_FALLBACK);
  const issuer = stringValue(environment.KEYCLOAK_ISSUER);
  const audience = stringValue(environment.KEYCLOAK_AUDIENCE);
  const jwksUri = stringValue(environment.KEYCLOAK_JWKS_URI);
  const errors: string[] = [];

  if (devHeaderFallback && !['true', 'false'].includes(devHeaderFallback)) {
    errors.push('AUTH_DEV_HEADER_FALLBACK moet "true" of "false" zijn.');
  }

  const fallbackEnabled = devHeaderFallback === 'true';

  if (fallbackEnabled && nodeEnvironment !== 'development') {
    errors.push('AUTH_DEV_HEADER_FALLBACK mag alleen in de developmentomgeving "true" zijn.');
  }

  if (nodeEnvironment === 'production') {
    if (devHeaderFallback !== 'false') {
      errors.push('AUTH_DEV_HEADER_FALLBACK moet in productie expliciet "false" zijn.');
    }

    if (!issuer) {
      errors.push('KEYCLOAK_ISSUER is verplicht in productie.');
    }

    if (!audience) {
      errors.push('KEYCLOAK_AUDIENCE is verplicht in productie.');
    }
  } else if (!fallbackEnabled && !issuer) {
    errors.push(
      'Configureer KEYCLOAK_ISSUER of zet AUTH_DEV_HEADER_FALLBACK expliciet op "true" voor lokale ontwikkeling.',
    );
  }

  if (issuer && !audience) {
    errors.push('KEYCLOAK_AUDIENCE is verplicht wanneer KEYCLOAK_ISSUER is geconfigureerd.');
  }

  validateHttpUrl('KEYCLOAK_ISSUER', issuer, errors);
  validateHttpUrl('KEYCLOAK_JWKS_URI', jwksUri, errors);

  if (errors.length > 0) {
    throw new Error(`Ongeldige authenticatieconfiguratie:\n- ${errors.join('\n- ')}`);
  }

  return environment;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function validateHttpUrl(name: string, value: string | undefined, errors: string[]) {
  if (!value) {
    return;
  }

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) {
      errors.push(`${name} moet een geldige HTTP(S)-URL zijn.`);
    }
  } catch {
    errors.push(`${name} moet een geldige HTTP(S)-URL zijn.`);
  }
}
