// @ts-check
import { E } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import { makeExo } from '@endo/exo';
import { withdrawFromSeat } from '@agoric/zoe/src/contractSupport/zoeHelpers.js';

const { keys, values } = Object;

/** @type {import('./@types/zoe-contract-facet').ContractMeta} */
export const meta = harden({
  customTermsShape: { namesByAddress: M.remotable('namesByAddress') },
});
// compatibility with an earlier contract metadata API
export const { customTermsShape } = meta;

/**
 * @typedef {object} PostalSvcTerms
 * @property {import('@agoric/vats').NameHub} namesByAddress
 */

/** @param {ZCF<PostalSvcTerms>} zcf */
export const start = zcf => {
  const { namesByAddress, issuers } = zcf.getTerms();
  mustMatch(namesByAddress, M.remotable('namesByAddress'));
  console.log('postal-service issuers', Object.keys(issuers));

  /**
   * @param {string} addr
   * @returns {ERef<DepositFacet>}
   */
  const getDepositFacet = addr => {
    assert.typeof(addr, 'string');
    return E(namesByAddress).lookup(addr, 'depositFacet');
  };

  /**
   * @param {string} addr
   * @param {Payment} pmt
   */
  const sendTo = (addr, pmt) => E(getDepositFacet(addr)).receive(pmt);

  /** @param {string} recipient */
  const makeSendInvitation = recipient => {
    assert.typeof(recipient, 'string');

    /** @type {OfferHandler} */
    const handleSend = async seat => {
      const { give } = seat.getProposal();
      const depositFacet = await getDepositFacet(recipient);
      const payouts = await withdrawFromSeat(zcf, seat, give);

      // XXX partial failure? return payments?
      await Promise.all(
        values(payouts).map(pmtP =>
          E.when(pmtP, pmt => E(depositFacet).receive(pmt)),
        ),
      );
      seat.exit();
      return `sent ${keys(payouts).join(', ')}`;
    };

    return zcf.makeInvitation(handleSend, 'send');
  };

  const publicFacet = makeExo('postalSvc', M.interface('postalSvc', {}, { defaultGuards: 'passable' }), {
    lookup: (...path) => E(namesByAddress).lookup(...path),
    getDepositFacet,
    sendTo,
    makeSendInvitation,
  });
  return { publicFacet };
};
/** @typedef { typeof start } PostalServiceFn */
