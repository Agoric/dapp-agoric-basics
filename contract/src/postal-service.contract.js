// @ts-check
import { E, Far } from '@endo/far';
import { M, mustMatch } from '@endo/patterns';
import { withdrawFromSeat } from '@agoric/zoe/src/contractSupport/zoeHelpers.js';
import { IssuerShape } from '@agoric/ertp/src/typeGuards.js';

/**
 * @import {ContractMeta} from './@types/zoe-contract-facet.js';
 * @import {ERef} from '@endo/far';
 * @import {DepositFacet, Payment, Issuer} from '@agoric/ertp/src/types.js';
 * @import {NameHub} from '@agoric/vats';
 */
const { keys, values } = Object;

/** @type {ContractMeta} */
export const meta = harden({
  customTermsShape: { namesByAddress: M.remotable('namesByAddress') },
});
harden(meta);
// compatibility with an earlier contract metadata API
export const { customTermsShape } = meta;
harden(customTermsShape);

/**
 * @typedef {object} PostalSvcTerms
 * @property {NameHub} namesByAddress
 */

/** @param {ZCF<PostalSvcTerms>} zcf */
export const start = zcf => {
  const { namesByAddress } = zcf.getTerms();
  mustMatch(namesByAddress, M.remotable('namesByAddress'));

  let issuerNumber = 1;

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

  /**
   * @param {string} recipient
   * @param {Issuer[]} issuers
   */
  const makeSendInvitation = (recipient, issuers) => {
    assert.typeof(recipient, 'string');
    mustMatch(issuers, M.arrayOf(IssuerShape));

    for (const i of issuers) {
      if (!Object.values(zcf.getTerms().issuers).includes(i)) {
        zcf.saveIssuer(i, `Issuer${(issuerNumber += 1)}`);
      }
    }

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

  const publicFacet = Far('postalSvc', {
    lookup: (...path) => E(namesByAddress).lookup(...path),
    getDepositFacet,
    sendTo,
    makeSendInvitation,
  });
  return { publicFacet };
};
harden(start);
/** @typedef { typeof start } PostalServiceFn */
