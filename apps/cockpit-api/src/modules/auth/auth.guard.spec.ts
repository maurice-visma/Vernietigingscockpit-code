import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, jest } from '@jest/globals';
import { AuthGuard } from './auth.guard';
import { KeycloakJwtService } from './keycloak-jwt.service';

function context(headers: Record<string, string | undefined> = {}) {
  const request: { headers: Record<string, string | undefined>; user?: unknown } = { headers };

  return {
    request,
    executionContext: {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    },
  };
}

function guard({
  isPublic = false,
  keycloakConfigured = false,
  devFallback,
}: {
  isPublic?: boolean;
  keycloakConfigured?: boolean;
  devFallback?: string;
}) {
  const reflector = {
    getAllAndOverride: () => isPublic,
  } as unknown as Reflector;
  const configService = {
    get: (key: string) => (key === 'AUTH_DEV_HEADER_FALLBACK' ? devFallback : undefined),
  } as unknown as ConfigService;
  const keycloakJwtService = {
    isConfigured: () => keycloakConfigured,
    validateBearerToken: jest.fn(async () => ({
      id: 'jwt-user',
      naam: 'JWT Gebruiker',
      rollen: ['archivaris'],
    })),
  } as unknown as KeycloakJwtService;

  return new AuthGuard(reflector, configService, keycloakJwtService);
}

describe('AuthGuard', () => {
  it('laat publieke routes zonder usercontext door', async () => {
    const { executionContext } = context();

    await expect(guard({ isPublic: true }).canActivate(executionContext as never)).resolves.toBe(true);
  });

  it('gebruikt header fallback wanneer Keycloak niet is geconfigureerd', async () => {
    const { request, executionContext } = context({
      'x-user-id': 'recordmanager-1',
      'x-user-name': 'Record Manager',
      'x-user-roles': 'recordmanager,proceseigenaar',
    });

    await expect(guard({}).canActivate(executionContext as never)).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'recordmanager-1',
      naam: 'Record Manager',
      rollen: ['recordmanager', 'proceseigenaar'],
    });
  });

  it('weigert requests zonder bearer token wanneer Keycloak strikt is geconfigureerd', async () => {
    const { executionContext } = context();

    await expect(
      guard({ keycloakConfigured: true, devFallback: 'false' }).canActivate(executionContext as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('valideert bearer tokens via Keycloak service', async () => {
    const { request, executionContext } = context({
      authorization: 'Bearer token-123',
    });

    await expect(
      guard({ keycloakConfigured: true, devFallback: 'false' }).canActivate(executionContext as never),
    ).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'jwt-user',
      naam: 'JWT Gebruiker',
      rollen: ['archivaris'],
    });
  });
});
