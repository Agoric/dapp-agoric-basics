/**
 * @file Contract to mint and sell a few ticket NFTs at a time.
 *
 * We declare variables (including functions) before using them,
 * so you may want to skip ahead and come back to some details.
 * @see {start} for the main contract entrypoint
 *
 * As is typical in Zoe contracts, the flow is:
 *   1. contract does internal setup and returns public / creator facets.
 *   2. client uses a public facet method -- {@link makeTradeInvitation} in this case --
 *      to make an invitation.
 *   3. client makes an offer using the invitation, along with
 *      a proposal (with give and want) and payments. Zoe escrows the payments, and then
 *   4. Zoe invokes the offer handler specified in step 2 -- here {@link tradeHandler}.
 *
 * @see {@link https://docs.agoric.com/guides/zoe/|Zoe Overview} for a walk-thru of this contract
 * @see {@link https://docs.agoric.com/guides/js-programming/hardened-js.html|Hardened JavaScript}
 * for background on `harden` and `assert`.
 */
// @ts-check

import { Far } from '@endo/far';
import { M, getCopyBagEntries } from '@endo/patterns';
import { AssetKind } from '@agoric/ertp/src/amountMath.js';
import { AmountShape } from '@agoric/ertp/src/typeGuards.js';
import { atomicRearrange } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import '@agoric/zoe/exported.js';

const { Fail, quote: q } = assert;

// #region bag utilities
/** @type { (xs: bigint[]) => bigint } */
const sum = xs => xs.reduce((acc, x) => acc + x, 0n);

/**
 * @param {import('@endo/patterns').CopyBag} bag
 * @returns {bigint[]}
 */
const bagCounts = bag => {
  const entries = getCopyBagEntries(bag);
  return entries.map(([_k, ct]) => ct);
};
// #endregion

/**
 * In addition to the standard `issuers` and `brands` terms,
 * this contract is parameterized by terms for price and,
 * optionally, a maximum number of tickets sold for that price (default: 3).
 *
 * @typedef {{
 *   tradePrice: Amount;
 *   maxTickets?: bigint;
 * }} AgoricBasicsTerms
 */

export const meta = {
  customTermsShape: M.splitRecord(
    { tradePrice: AmountShape },
    { maxTickets: M.bigint() },
  ),
};
// compatibility with an earlier contract metadata API
export const customTermsShape = meta.customTermsShape;

/**
 * Start a contract that
 *   - creates a new non-fungible asset type for Tickets, and
 *   - handles offers to buy up to `maxTickets` tickets at a time.
 *
 * @param {ZCF<AgoricBasicsTerms>} zcf
 */
export const start = async zcf => {
  const { tradePrice, maxTickets = 3n } = zcf.getTerms();

  /**
   * a new ERTP mint for tickets, accessed thru the Zoe Contract Facet.
   * Note: `makeZCFMint` makes the associated brand and issuer available
   * in the contract's terms.
   *
   * AssetKind.COPY_BAG can express non-fungible (or rather: semi-fungible)
   * amounts such as: 3 potions and 1 map.
   */
  const ticketMint = await zcf.makeZCFMint('Ticket', AssetKind.COPY_BAG);
  const { brand: ticketBrand } = ticketMint.getIssuerRecord();

  /**
   * a pattern to constrain proposals given to {@link tradeHandler}
   *
   * The `Price` amount must be >= `tradePrice` term.
   * The `Tickets` amount must use the `Ticket` brand and a bag value.
   */
  const proposalShape = harden({
    give: { Price: M.gte(tradePrice) },
    want: { Tickets: { brand: ticketBrand, value: M.bag() } },
    exit: M.any(),
  });

  /** a seat for allocating proceeds of sales */
  const proceeds = zcf.makeEmptySeatKit().zcfSeat;

  /** @type {OfferHandler} */
  const tradeHandler = buyerSeat => {
    // give and want are guaranteed by Zoe to match proposalShape
    const { want } = buyerSeat.getProposal();

    sum(bagCounts(want.Tickets.value)) <= maxTickets ||
      Fail`max ${q(maxTickets)} tickets allowed: ${q(want.Tickets)}`;

    const newTickets = ticketMint.mintGains(want);
    atomicRearrange(
      zcf,
      harden([
        // price from buyer to proceeds
        [buyerSeat, proceeds, { Price: tradePrice }],
        // new tickets to buyer
        [newTickets, buyerSeat, want],
      ]),
    );

    buyerSeat.exit(true);
    newTickets.exit();
    return 'trade complete';
  };

  /**
   * Make an invitation to trade for tickets.
   *
   * Proposal Keywords used in offers using these invitations:
   *   - give: `Price`
   *   - want: `Tickets`
   */
  const makeTradeInvitation = () =>
    zcf.makeInvitation(tradeHandler, 'buy tickets', undefined, proposalShape);

  // Mark the publicFacet Far, i.e. reachable from outside the contract
  const publicFacet = Far('Tickets Public Facet', {
    makeTradeInvitation,
  });
  return harden({ publicFacet });
};
harden(start);
