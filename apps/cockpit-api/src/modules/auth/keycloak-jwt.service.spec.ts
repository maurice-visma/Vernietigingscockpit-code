import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, jest } from '@jest/globals';
import { KeycloakJwtService } from './keycloak-jwt.service';

function serviceWith(jwtVerify: unknown) {
  const configService = {
    get: (key: string) =>
      ({
        KEYCLOAK_ISSUER: 'https://identity.example.nl/realms/cockpit',
        KEYCLOAK_AUDIENCE: 'vernietigingscockpit-api',
      })[key],
  } as unknown as ConfigService;
  const service = new KeycloakJwtService(configService);

  Object.assign(service, {
    loadJose: async () => ({ jwtVerify }),
    getJwks: async () => ({ local: 'jwks' }),
  });

  return service;
}

describe('KeycloakJwtService', () => {
  it('valideert issuer en audience en mapt geldige claims', async () => {
    const jwtVerify = jest.fn(async (_token: string, _jwks: unknown, _options: unknown) => ({
      payload: {
        sub: 'gebruiker-1',
        name: 'Test Gebruiker',
        realm_access: { roles: ['recordmanager'] },
      },
    }));
    const service = serviceWith(jwtVerify);

    await expect(service.validateBearerToken('geldig-token')).resolves.toEqual({
      id: 'gebruiker-1',
      naam: 'Test Gebruiker',
      rollen: ['recordmanager'],
    });
    expect(jwtVerify).toHaveBeenCalledWith(
      'geldig-token',
      { local: 'jwks' },
      {
        issuer: 'https://identity.example.nl/realms/cockpit',
        audience: 'vernietigingscockpit-api',
      },
    );
  });

  it('geeft 401 voor een token dat JWT-validatie niet doorstaat', async () => {
    const jwtVerify = jest.fn(async (_token: string, _jwks: unknown, _options: unknown) => {
      throw new Error('unexpected audience');
    });
    const service = serviceWith(jwtVerify);

    await expect(service.validateBearerToken('verkeerde-audience')).rejects.toEqual(
      new UnauthorizedException('Bearer token is ongeldig of verlopen.'),
    );
  });
});
