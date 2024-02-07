/**
 * @file Permission Contract Deployment builder
 *
 * Creates files for starting an instance of the contract:
 * * contract source and instantiation proposal bundles to be published via
 *   `agd tx swingset install-bundle`
 * * start-agoric-basics-permit.json and start-agoric-basics.js to submit the
 *   instantiation proposal via `agd tx gov submit-proposal swingset-core-eval`
 *
 * Usage:
 *   agoric run build-contract-deployer.js
 */

import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForAgoricBasics } from '../src/agoric-basics-proposal.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const agoricBasicsProposalBuilder = async ({ publishRef, install }) => {
  return harden({
    sourceSpec: '../src/agoric-basics-proposal.js',
    getManifestCall: [
      getManifestForAgoricBasics.name,
      {
        agoricBasicsRef: publishRef(
          install(
            '../src/agoric-basics.contract.js',
            '../bundles/bundle-agoric-basics.js',
            {
              persist: true,
            },
          ),
        ),
      },
    ],
  });
};

/** @type {DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('start-agoric-basics', agoricBasicsProposalBuilder);
};
