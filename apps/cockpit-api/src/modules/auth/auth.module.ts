import { Module } from '@nestjs/common';
import { KeycloakJwtService } from './keycloak-jwt.service';

@Module({
  providers: [KeycloakJwtService],
  exports: [KeycloakJwtService],
})
export class AuthModule {}
