import { describe, expect, it } from '@jest/globals';
import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it('accepteert een volledige productieconfiguratie', () => {
    const environment = {
      NODE_ENV: 'production',
      AUTH_DEV_HEADER_FALLBACK: 'false',
      KEYCLOAK_ISSUER: 'https://identity.example.nl/realms/cockpit',
      KEYCLOAK_AUDIENCE: 'vernietigingscockpit-api',
    };

    expect(validateEnvironment(environment)).toBe(environment);
  });

  it('weigert productie zonder expliciet uitgeschakelde ontwikkelfallback', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        KEYCLOAK_ISSUER: 'https://identity.example.nl/realms/cockpit',
        KEYCLOAK_AUDIENCE: 'vernietigingscockpit-api',
      }),
    ).toThrow('AUTH_DEV_HEADER_FALLBACK moet in productie expliciet "false" zijn.');
  });

  it('weigert productie zonder issuer en audience', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        AUTH_DEV_HEADER_FALLBACK: 'false',
      }),
    ).toThrow('KEYCLOAK_ISSUER is verplicht in productie.');
  });

  it('staat de headerfallback alleen toe na een expliciete lokale keuze', () => {
    const environment = {
      NODE_ENV: 'development',
      AUTH_DEV_HEADER_FALLBACK: 'true',
    };

    expect(validateEnvironment(environment)).toBe(environment);
    expect(() => validateEnvironment({ NODE_ENV: 'development' })).toThrow(
      'Configureer KEYCLOAK_ISSUER',
    );
  });

  it('weigert de ontwikkelfallback in staging en productieachtige omgevingen', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'staging',
        AUTH_DEV_HEADER_FALLBACK: 'true',
      }),
    ).toThrow('AUTH_DEV_HEADER_FALLBACK mag alleen in de developmentomgeving "true" zijn.');
  });

  it('vereist audiencevalidatie zodra een issuer is geconfigureerd', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'development',
        AUTH_DEV_HEADER_FALLBACK: 'false',
        KEYCLOAK_ISSUER: 'https://identity.example.nl/realms/cockpit',
      }),
    ).toThrow('KEYCLOAK_AUDIENCE is verplicht wanneer KEYCLOAK_ISSUER is geconfigureerd.');
  });
});
