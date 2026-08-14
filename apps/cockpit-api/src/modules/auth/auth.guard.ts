import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { KeycloakJwtService } from './keycloak-jwt.service';
import { IS_PUBLIC_KEY } from './public.decorator';
import { UserContext } from './user-context';

interface RequestWithUser {
  headers: Record<string, string | string[] | undefined>;
  user?: UserContext;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly keycloakJwtService: KeycloakJwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const bearerToken = this.bearerToken(request);

    if (bearerToken) {
      request.user = await this.keycloakJwtService.validateBearerToken(bearerToken);
      return true;
    }

    if (this.devHeaderFallbackEnabled()) {
      request.user = {
        id: this.headerValue(request, 'x-user-id') ?? 'system',
        naam: this.headerValue(request, 'x-user-name') ?? 'Systeemgebruiker',
        rollen: (this.headerValue(request, 'x-user-roles') ?? 'beheerder')
          .split(',')
          .map((rol) => rol.trim())
          .filter(Boolean),
      };

      return true;
    }

    throw new UnauthorizedException('Authorization Bearer token ontbreekt.');
  }

  private bearerToken(request: RequestWithUser): string | undefined {
    const authorization = this.headerValue(request, 'authorization');
    const [scheme, token] = authorization?.split(' ') ?? [];
    return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
  }

  private devHeaderFallbackEnabled(): boolean {
    if (!this.keycloakJwtService.isConfigured()) {
      return true;
    }

    return this.configService.get<string>('AUTH_DEV_HEADER_FALLBACK') === 'true';
  }

  private headerValue(request: RequestWithUser, name: string): string | undefined {
    const value = request.headers[name];
    return Array.isArray(value) ? value[0] : value;
  }
}
