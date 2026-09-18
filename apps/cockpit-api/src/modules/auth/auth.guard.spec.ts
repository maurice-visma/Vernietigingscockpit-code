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
  devFallback,
}: {
  isPublic?: boolean;
  devFallback?: string;
}) {
  const reflector = {
    getAllAndOverride: () => isPublic,
  } as unknown as Reflector;
  const configService = {
    get: (key: string) => (key === 'AUTH_DEV_HEADER_FALLBACK' ? devFallback : undefined),
  } as unknown as ConfigService;
  const keycloakJwtService = {
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

  it('gebruikt header fallback alleen wanneer deze expliciet is ingeschakeld', async () => {
    const { request, executionContext } = context({
      'x-user-id': 'recordmanager-1',
      'x-user-name': 'Record Manager',
      'x-user-roles': 'recordmanager,proceseigenaar',
    });

    await expect(guard({ devFallback: 'true' }).canActivate(executionContext as never)).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'recordmanager-1',
      naam: 'Record Manager',
      rollen: ['recordmanager', 'proceseigenaar'],
    });
  });

  it('weigert requests zonder bearer token wanneer geen fallback is ingesteld', async () => {
    const { executionContext } = context({
      'x-user-id': 'lokale-omzeiling',
      'x-user-roles': 'beheerder',
    });

    await expect(guard({}).canActivate(executionContext as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('weigert requests zonder bearer token wanneer Keycloak strikt is geconfigureerd', async () => {
    const { executionContext } = context();

    await expect(
      guard({ devFallback: 'false' }).canActivate(executionContext as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('valideert bearer tokens via Keycloak service', async () => {
    const { request, executionContext } = context({
      authorization: 'Bearer token-123',
    });

    await expect(
      guard({ devFallback: 'false' }).canActivate(executionContext as never),
    ).resolves.toBe(true);
    expect(request.user).toEqual({
      id: 'jwt-user',
      naam: 'JWT Gebruiker',
      rollen: ['archivaris'],
    });
  });
});
