import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserContext } from '../auth/user-context';
import { Roles } from '../auth/roles.decorator';
import { DOSSIER_READ_ROLES, RECORDMANAGER_ONLY } from '../auth/role-policy';
import { DossierService } from './dossier.service';
import { WorkflowService } from '../workflow/workflow.service';
import { MarkeerBeoordeeldDto, ReviewregelQueryDto, UpdateReviewregelDto } from './dossier.dto';

@Controller('taken/:taakId/taakuitvoeringen/:taakuitvoeringId')
export class DossierController {
  constructor(
    private readonly dossierService: DossierService,
    private readonly workflowService: WorkflowService,
  ) {}

  @Get('reviewregels')
  @Roles(...DOSSIER_READ_ROLES)
  listReviewregels(
    @Param('taakId') taakId: string,
    @Param('taakuitvoeringId') taakuitvoeringId: string,
    @Query() query: ReviewregelQueryDto,
  ) {
    return this.dossierService.listReviewregels({ taakId, taakuitvoeringId }, query);
  }

  @Patch('reviewregels/:reviewregelId')
  @Roles(...RECORDMANAGER_ONLY)
  updateReviewregel(
    @Param('taakId') taakId: string,
    @Param('taakuitvoeringId') taakuitvoeringId: string,
    @Param('reviewregelId') reviewregelId: string,
    @Body() dto: UpdateReviewregelDto,
    @CurrentUser() gebruiker: UserContext,
  ) {
    return this.dossierService.updateReviewregel({ taakId, taakuitvoeringId }, reviewregelId, dto, gebruiker);
  }

  @Post('reviewregels/markeer-beoordeeld')
  @Roles(...RECORDMANAGER_ONLY)
  markeerReviewregelsBeoordeeld(
    @Param('taakId') taakId: string,
    @Param('taakuitvoeringId') taakuitvoeringId: string,
    @Body() dto: MarkeerBeoordeeldDto,
    @CurrentUser() gebruiker: UserContext,
  ) {
    return this.dossierService.markeerBeoordeeld({ taakId, taakuitvoeringId }, dto, gebruiker);
  }

  @Post('review/doorzetten')
  @Roles(...RECORDMANAGER_ONLY)
  doorzettenNaarProceseigenaar(
    @Param('taakId') taakId: string,
    @Param('taakuitvoeringId') taakuitvoeringId: string,
    @CurrentUser() gebruiker: UserContext,
  ) {
    return this.workflowService.transition(
      { taakId, taakuitvoeringId },
      'wacht_op_proceseigenaar',
      gebruiker,
      'review.doorgestuurd.proceseigenaar',
    );
  }

  @Get('resultaatregels')
  @Roles(...RECORDMANAGER_ONLY)
  listResultaatregels(@Param('taakId') taakId: string, @Param('taakuitvoeringId') taakuitvoeringId: string) {
    return this.dossierService.listResultaatregels({ taakId, taakuitvoeringId });
  }

  @Get('verklaring')
  @Roles(...RECORDMANAGER_ONLY)
  downloadVernietigingsverklaring(
    @Param('taakId') taakId: string,
    @Param('taakuitvoeringId') taakuitvoeringId: string,
  ) {
    return this.dossierService.getVernietigingsverklaring({ taakId, taakuitvoeringId });
  }

  @Post('export')
  @Roles(...RECORDMANAGER_ONLY)
  exporteerVernietigingsresultaat(
    @Param('taakId') taakId: string,
    @Param('taakuitvoeringId') taakuitvoeringId: string,
  ) {
    return this.dossierService.exporteerVernietigingsresultaat({ taakId, taakuitvoeringId });
  }
}
