// @ts-check
import { E } from '@endo/far';

import { allValues } from '../objectTools.js';

/**
 * @template SF @typedef {import('@agoric/zoe/src/zoeService/utils').StartResult<SF>} StartResult<SF>
 */

/**
 * @typedef {StartResult<
 *   typeof import('@agoric/governance/src/committee.js').prepare
 * >} CommitteeStart
 */

// import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
const CONTRACT_ELECTORATE = 'Electorate';
export const ParamTypes = /** @type {const} */ ({
  INVITATION: 'invitation',
});

/**
 * Like startGovernedInstance but with parameterized committeeCreatorFacet
 *
 * @template {GovernableStartFn} SF
 * @param {{
 *   zoe: ERef<ZoeService>;
 *   governedContractInstallation: ERef<Installation<SF>>;
 *   issuerKeywordRecord?: IssuerKeywordRecord;
 *   terms: Record<string, unknown>;
 *   privateArgs: any; // TODO: connect with Installation type
 *   label: string;
 * }} zoeArgs
 * @param {{
 *   governedParams: Record<string, unknown>;
 *   timer: ERef<import('@agoric/time/src/types').TimerService>;
 *   contractGovernor: ERef<Installation>;
 *   governorTerms: Record<string, unknown>;
 *   committeeCreatorFacet: CommitteeStart['creatorFacet'];
 * }} govArgs
 * @returns {Promise<GovernanceFacetKit<SF>>}
 */
export const startMyGovernedInstance = async (
  {
    zoe,
    governedContractInstallation,
    issuerKeywordRecord,
    terms,
    privateArgs,
    label,
  },
  {
    governedParams,
    timer,
    contractGovernor,
    governorTerms,
    committeeCreatorFacet,
  },
) => {
  console.log('Getting poser invitation...');

  const poserInvitationP = E(committeeCreatorFacet).getPoserInvitation();
  const [initialPoserInvitation, electorateInvitationAmount] =
    await Promise.all([
      poserInvitationP,
      E(E(zoe).getInvitationIssuer()).getAmountOf(poserInvitationP),
    ]);

  const fullGovernorTerms = await allValues({
    timer,
    governedContractInstallation,
    governed: {
      terms: {
        ...terms,
        governedParams: {
          [CONTRACT_ELECTORATE]: {
            type: ParamTypes.INVITATION,
            value: electorateInvitationAmount,
          },
          ...governedParams,
        },
      },
      issuerKeywordRecord,
      label,
    },
    ...governorTerms,
  });
  const governorFacets = await E(zoe).startInstance(
    contractGovernor,
    {},
    fullGovernorTerms,
    harden({
      governed: await allValues({
        ...privateArgs,
        initialPoserInvitation,
      }),
    }),
    `${label}-governor`,
  );
  const [instance, publicFacet, creatorFacet, adminFacet] = await Promise.all([
    E(governorFacets.creatorFacet).getInstance(),
    E(governorFacets.creatorFacet).getPublicFacet(),
    E(governorFacets.creatorFacet).getCreatorFacet(),
    E(governorFacets.creatorFacet).getAdminFacet(),
  ]);
  /** @type {GovernanceFacetKit<SF>} */
  const facets = harden({
    instance,
    publicFacet,
    governor: governorFacets.instance,
    creatorFacet,
    adminFacet,
    governorCreatorFacet: governorFacets.creatorFacet,
    governorAdminFacet: governorFacets.adminFacet,
  });
  return facets;
};
