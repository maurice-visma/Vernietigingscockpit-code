import { Body, Controller, Param, Put } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { UserContext } from '../auth/user-context';
import { COCKPIT_ROLES } from '../auth/role-policy';
import { AccorderingDto } from './besluitvorming.dto';
import { BesluitvormingService } from './besluitvorming.service';

@Controller('taken/:taakId/taakuitvoeringen/:taakuitvoeringId/accorderingen')
export class BesluitvormingController {
  constructor(private readonly besluitvormingService: BesluitvormingService) {}

  @Put('proceseigenaar')
  @Roles(COCKPIT_ROLES.proceseigenaar)
  legProceseigenaarAccorderingVast(
    @Param('taakId') taakId: string,
    @Param('taakuitvoeringId') taakuitvoeringId: string,
    @Body() dto: AccorderingDto,
    @CurrentUser() gebruiker: UserContext,
  ) {
    return this.besluitvormingService.legProceseigenaarAccorderingVast(
      { taakId, taakuitvoeringId },
      dto,
      gebruiker,
    );
  }

  @Put('archivaris')
  @Roles(COCKPIT_ROLES.archivaris)
  legArchivarisAccorderingVast(
    @Param('taakId') taakId: string,
    @Param('taakuitvoeringId') taakuitvoeringId: string,
    @Body() dto: AccorderingDto,
    @CurrentUser() gebruiker: UserContext,
  ) {
    return this.besluitvormingService.legArchivarisAccorderingVast({ taakId, taakuitvoeringId }, dto, gebruiker);
  }
}
