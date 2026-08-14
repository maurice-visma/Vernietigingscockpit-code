import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from '@jest/globals';
import { RolesGuard } from './roles.guard';

function contextWithRoles(roles: string[]) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          id: 'user-1',
          naam: 'Testgebruiker',
          rollen: roles,
        },
      }),
    }),
  };
}

describe('RolesGuard', () => {
  it('laat requests zonder verplichte rollen door', () => {
    const reflector = {
      getAllAndOverride: () => undefined,
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextWithRoles([]) as never)).toBe(true);
  });

  it('laat gebruikers met een verplichte rol door', () => {
    const reflector = {
      getAllAndOverride: () => ['archivaris'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextWithRoles(['recordmanager', 'archivaris']) as never)).toBe(true);
  });

  it('weigert gebruikers zonder verplichte rol', () => {
    const reflector = {
      getAllAndOverride: () => ['proceseigenaar'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(() => guard.canActivate(contextWithRoles(['recordmanager']) as never)).toThrow(ForbiddenException);
  });
});
