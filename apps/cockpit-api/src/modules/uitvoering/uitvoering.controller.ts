import { Body, Controller, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserContext } from '../auth/user-context';
import { StartSelectieDto, StartVernietigingDto } from './uitvoering.dto';
import { UitvoeringService } from './uitvoering.service';

@Controller('taken/:taakId/taakuitvoeringen/:taakuitvoeringId')
export class UitvoeringController {
  constructor(private readonly uitvoeringService: UitvoeringService) {}

  @Post('selectie')
  startSelectie(
    @Param('taakId') taakId: string,
    @Param('taakuitvoeringId') taakuitvoeringId: string,
    @Body() dto: StartSelectieDto,
    @CurrentUser() gebruiker: UserContext,
  ) {
    return this.uitvoeringService.startSelectie({ taakId, taakuitvoeringId }, dto, gebruiker);
  }

  @Post('vernietiging')
  startVernietiging(
    @Param('taakId') taakId: string,
    @Param('taakuitvoeringId') taakuitvoeringId: string,
    @Body() dto: StartVernietigingDto,
  ) {
    return this.uitvoeringService.startVernietiging({ taakId, taakuitvoeringId }, dto);
  }

  @Post('archivering')
  archiveerTaakuitvoering(
    @Param('taakId') taakId: string,
    @Param('taakuitvoeringId') taakuitvoeringId: string,
  ) {
    return this.uitvoeringService.archiveerTaakuitvoering({ taakId, taakuitvoeringId });
  }
}
