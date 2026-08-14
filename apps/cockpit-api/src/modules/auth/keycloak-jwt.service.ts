import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserContext } from './user-context';

type JwtVerify = typeof import('jose').jwtVerify;
type CreateRemoteJWKSet = typeof import('jose').createRemoteJWKSet;
type RemoteJWKSet = ReturnType<CreateRemoteJWKSet>;
type JWTPayload = import('jose').JWTPayload;

@Injectable()
export class KeycloakJwtService {
  private jwks?: RemoteJWKSet;
  private jwtVerify?: JwtVerify;

  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.issuer);
  }

  async validateBearerToken(token: string): Promise<UserContext> {
    if (!this.issuer) {
      throw new UnauthorizedException('Keycloak issuer is niet geconfigureerd.');
    }

    const { jwtVerify } = await this.loadJose();
    const { payload } = await jwtVerify(token, await this.getJwks(), {
      issuer: this.issuer,
      audience: this.audience,
    });

    return this.payloadToUserContext(payload);
  }

  private async loadJose() {
    if (!this.jwtVerify) {
      const jose = await import('jose');
      this.jwtVerify = jose.jwtVerify;
    }

    return { jwtVerify: this.jwtVerify };
  }

  private async getJwks(): Promise<RemoteJWKSet> {
    if (!this.jwks) {
      const { createRemoteJWKSet } = await import('jose');
      this.jwks = createRemoteJWKSet(new URL(this.jwksUri));
    }

    return this.jwks;
  }

  private payloadToUserContext(payload: JWTPayload): UserContext {
    const preferredUsername = this.stringClaim(payload, 'preferred_username');
    const name = this.stringClaim(payload, 'name');
    const email = this.stringClaim(payload, 'email');

    return {
      id: payload.sub ?? preferredUsername ?? email ?? 'unknown',
      naam: name ?? preferredUsername ?? email ?? payload.sub ?? 'Onbekende gebruiker',
      rollen: this.extractRoles(payload),
    };
  }

  private extractRoles(payload: JWTPayload): string[] {
    const roles = new Set<string>();
    const realmAccess = payload.realm_access;

    if (this.hasRoles(realmAccess)) {
      realmAccess.roles.forEach((role) => roles.add(role));
    }

    const resourceAccess = payload.resource_access;
    if (resourceAccess && typeof resourceAccess === 'object') {
      Object.values(resourceAccess).forEach((resource) => {
        if (this.hasRoles(resource)) {
          resource.roles.forEach((role) => roles.add(role));
        }
      });
    }

    return [...roles];
  }

  private hasRoles(value: unknown): value is { roles: string[] } {
    return (
      Boolean(value) &&
      typeof value === 'object' &&
      Array.isArray((value as { roles?: unknown }).roles) &&
      (value as { roles: unknown[] }).roles.every((role) => typeof role === 'string')
    );
  }

  private stringClaim(payload: JWTPayload, claim: string): string | undefined {
    const value = payload[claim];
    return typeof value === 'string' ? value : undefined;
  }

  private get issuer(): string | undefined {
    return this.configService.get<string>('KEYCLOAK_ISSUER');
  }

  private get audience(): string | undefined {
    return this.configService.get<string>('KEYCLOAK_AUDIENCE');
  }

  private get jwksUri(): string {
    return (
      this.configService.get<string>('KEYCLOAK_JWKS_URI') ??
      `${this.issuer}/protocol/openid-connect/certs`
    );
  }
}
