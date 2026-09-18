import { Controller, Get, Param, Query } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { STEKKER_STATUS_ROLES } from '../auth/role-policy';
import { StekkerService } from './stekker.service';

@Controller('taken/:taakId/taakuitvoeringen/:taakuitvoeringId/stekkers')
export class StekkerController {
  constructor(private readonly stekkerService: StekkerService) {}

  @Get()
  @Roles(...STEKKER_STATUS_ROLES)
  listStekkers(
    @Param('taakuitvoeringId') taakuitvoeringId: string,
    @Query('fase') fase?: 'selectie' | 'uitvoering',
  ) {
    return {
      items: this.stekkerService.listStekkers(taakuitvoeringId, fase),
    };
  }
}
