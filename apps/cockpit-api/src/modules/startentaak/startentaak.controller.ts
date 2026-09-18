import { Controller, Get, Param } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { ALL_COCKPIT_ROLES } from '../auth/role-policy';
import { StartentaakService } from './startentaak.service';

@Controller('taken/:taakId/taakuitvoeringen')
export class StartentaakController {
  constructor(private readonly startentaakService: StartentaakService) {}

  @Get()
  @Roles(...ALL_COCKPIT_ROLES)
  listTaakuitvoeringen() {
    return this.startentaakService.listTaakuitvoeringen();
  }

  @Get(':taakuitvoeringId')
  @Roles(...ALL_COCKPIT_ROLES)
  getTaakuitvoering(
    @Param('taakId') taakId: string,
    @Param('taakuitvoeringId') taakuitvoeringId: string,
  ) {
    return this.startentaakService.getTaakuitvoering(taakId, taakuitvoeringId);
  }
}
