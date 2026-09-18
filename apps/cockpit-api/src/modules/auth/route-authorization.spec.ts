import { describe, expect, it } from '@jest/globals';
import { BesluitvormingController } from '../besluitvorming/besluitvorming.controller';
import { DossierController } from '../dossier/dossier.controller';
import { StartentaakController } from '../startentaak/startentaak.controller';
import { StekkerController } from '../stekker/stekker.controller';
import { UitvoeringController } from '../uitvoering/uitvoering.controller';
import {
  ALL_COCKPIT_ROLES,
  COCKPIT_ROLES,
  DOSSIER_READ_ROLES,
  RECORDMANAGER_ONLY,
  STEKKER_STATUS_ROLES,
} from './role-policy';
import { ROLES_KEY } from './roles.decorator';

type ControllerMethod = {
  controller: object;
  method: string;
  roles: string[];
};

const routes: ControllerMethod[] = [
  {
    controller: StartentaakController.prototype,
    method: 'getTaakuitvoering',
    roles: ALL_COCKPIT_ROLES,
  },
  {
    controller: UitvoeringController.prototype,
    method: 'startSelectie',
    roles: RECORDMANAGER_ONLY,
  },
  {
    controller: UitvoeringController.prototype,
    method: 'startVernietiging',
    roles: RECORDMANAGER_ONLY,
  },
  {
    controller: UitvoeringController.prototype,
    method: 'archiveerTaakuitvoering',
    roles: RECORDMANAGER_ONLY,
  },
  {
    controller: DossierController.prototype,
    method: 'listReviewregels',
    roles: DOSSIER_READ_ROLES,
  },
  {
    controller: DossierController.prototype,
    method: 'updateReviewregel',
    roles: RECORDMANAGER_ONLY,
  },
  {
    controller: DossierController.prototype,
    method: 'markeerReviewregelsBeoordeeld',
    roles: RECORDMANAGER_ONLY,
  },
  {
    controller: DossierController.prototype,
    method: 'listResultaatregels',
    roles: RECORDMANAGER_ONLY,
  },
  {
    controller: DossierController.prototype,
    method: 'downloadVernietigingsverklaring',
    roles: RECORDMANAGER_ONLY,
  },
  {
    controller: DossierController.prototype,
    method: 'exporteerVernietigingsresultaat',
    roles: RECORDMANAGER_ONLY,
  },
  {
    controller: StekkerController.prototype,
    method: 'listStekkers',
    roles: STEKKER_STATUS_ROLES,
  },
  {
    controller: BesluitvormingController.prototype,
    method: 'legProceseigenaarAccorderingVast',
    roles: [COCKPIT_ROLES.proceseigenaar],
  },
  {
    controller: BesluitvormingController.prototype,
    method: 'legArchivarisAccorderingVast',
    roles: [COCKPIT_ROLES.archivaris],
  },
];

describe('route-autorisatiematrix', () => {
  it.each(routes)('$method vereist de bedoelde cockpitrollen', ({ controller, method, roles }) => {
    const handler = controller[method as keyof typeof controller];
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual(roles);
  });

  it('dekt iedere niet-publieke controllerhandeling expliciet af', () => {
    const coveredMethods = new Set(routes.map(({ controller, method }) => `${controller.constructor.name}.${method}`));
    const controllers = [
      StartentaakController,
      UitvoeringController,
      DossierController,
      StekkerController,
      BesluitvormingController,
    ];
    const actualMethods = controllers.flatMap((controller) =>
      Object.getOwnPropertyNames(controller.prototype)
        .filter((method) => method !== 'constructor')
        .map((method) => `${controller.name}.${method}`),
    );

    expect([...coveredMethods].sort()).toEqual(actualMethods.sort());
  });
});
