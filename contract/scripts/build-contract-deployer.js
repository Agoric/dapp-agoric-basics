/**
 * @file Permission Contract Deployment builder
 *
 * Creates files for starting an instance of the contract:
 * * contract source and instantiation proposal bundles to be published via
 *   `agd tx swingset install-bundle`
 * * start-sell-concert-tickets-permit.json and start-sell-concert-tickets.js to submit the
 *   instantiation proposal via `agd tx gov submit-proposal swingset-core-eval`
 *
 * Usage:
 *   agoric run build-contract-deployer.js
 */

import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForSellConcertTickets } from '../src/sell-concert-tickets-proposal.js';

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').ProposalBuilder} */
export const sellConcertTicketsProposalBuilder = async ({
  publishRef,
  install,
}) => {
  return harden({
    sourceSpec: '../src/sell-concert-tickets-proposal.js',
    getManifestCall: [
      getManifestForSellConcertTickets.name,
      {
        sellConcertTicketsRef: publishRef(
          install(
            '../src/sell-concert-tickets.contract.js',
            '../bundles/bundle-sell-concert-tickets.js',
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
  await writeCoreProposal('start-sell-concert-tickets', sellConcertTicketsProposalBuilder);
};
