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
import { M, getCopyBagEntries, makeCopyBag } from '@endo/patterns';
import { AssetKind } from '@agoric/ertp/src/amountMath.js';
import { atomicRearrange } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import '@agoric/zoe/exported.js';
import { AmountMath, AmountShape } from '@agoric/ertp';

const { Fail, quote: q } = assert;

// #region bag utilities
/**
 *
 * @param {Amount} amount
 * @param {number} n
 * @returns {Amount}
 */
const multiply = (amount, n) => {
  const arr = Array.from({ length: n });
  return arr.reduce(
    (sum, _) => AmountMath.add(amount, sum),
    AmountMath.make(amount.brand, 0n),
  );
};

/**
 *
 * @param {Amount} sum
 * @param {[string, bigint]} entry
 * @param {Inventory} inventory
 * @returns {Amount}
 */
const addMultiples = (sum, entry, inventory) => {
  const multiple = multiply(inventory[entry[0]].tradePrice, Number(entry[1]));
  return AmountMath.add(multiple, sum);
};

/**
 *
 * @param {import('@endo/patterns').CopyBag} bag
 * @param {Inventory} inventory
 * @returns {Amount}
 */
export const bagPrice = (bag, inventory) => {
  /** @type {[string, bigint][]} */
  const entries = getCopyBagEntries(bag);
  const values = Object.values(inventory);
  const brand = values[0].tradePrice.brand;
  return entries.reduce(
    (sum, entry) => addMultiples(sum, entry, inventory),
    AmountMath.makeEmpty(brand),
  );
};
// #endregion

/**
 * Inventory contains price and maximum for each type of tickets
 * @example
 * {
 *   frontRow: {
 *     tradePrice: AmountMath.make(istBrand, 3n),
 *     maxTickets: 3n,
 *   },
 * }
 * @typedef {{[key: string]: {tradePrice: Amount, maxTickets: NatValue}}} Inventory
 */

/**
 * In addition to the standard `issuers` and `brands` terms,
 * this contract is parameterized by terms for inventory
 *
 * @typedef {{
 *   inventory: Inventory
 * }} SellConcertTicketsTerms
 */

export const meta = {
  customTermsShape: M.recordOf(
    M.string(),
    // M.splitRecord({ tradePrice: AmountShape, maxTickets: M.nat() }),
    // getting an error of
    // customTerms: inventory: [1]: {} - Must have missing properties ["tradePrice","maxTickets"]
    M.any(),
  ),
};
// compatibility with an earlier contract metadata API
export const customTermsShape = meta.customTermsShape;

/**
 * Start a contract that
 *   - creates a new non-fungible asset type for Tickets, and
 *   - handles offers to buy as many tickets as inventory allows
 *
 * @param {ZCF<SellConcertTicketsTerms>} zcf
 */
export const start = async zcf => {
  const { inventory } = zcf.getTerms();

  const inventoryValues = Object.values(inventory);

  // make sure inventory is not empty
  inventoryValues.length > 0 || Fail`inventory must not be empty`;
  // make sure all kinds of tickets have the same brand for tradePrice
  inventoryValues.every(
    v => v.tradePrice.brand === inventoryValues[0].tradePrice.brand,
  ) || Fail`inventory must have the same brand for all tickets' tradePrice`;

  /**
   * a new ERTP mint for tickets, accessed thru the Zoe Contract Facet.
   * Note: `makeZCFMint` makes the associated brand and issuer available
   * in the contract's terms.
   *
   * AssetKind.COPY_BAG can express non-fungible (or rather: semi-fungible)
   * amounts such as: 3 frontRow tickets and 1 middleRow ticket.
   */
  const ticketMint = await zcf.makeZCFMint('Ticket', AssetKind.COPY_BAG);
  const { brand: ticketBrand } = ticketMint.getIssuerRecord();

  const inventoryBag = makeCopyBag(
    Object.entries(inventory).map(([ticket, { maxTickets }], _i) => [
      ticket,
      maxTickets,
    ]),
  );
  const toMint = {
    Tickets: {
      brand: ticketBrand,
      value: inventoryBag,
    },
  };
  /**
   * Mint the whole inventory at contract start time, this also allows us to
   * check if user is buying more than our inventory allows using
   * `AmountMath.GTE` function
   */
  const inventorySeat = ticketMint.mintGains(toMint);

  /**
   * a pattern to constrain proposals given to {@link tradeHandler}
   *
   * The `Price` amount must be AmountShape.
   * The `Tickets` amount must use the `Ticket` brand and a bag value.
   */
  const proposalShape = harden({
    give: { Price: AmountShape },
    want: { Tickets: { brand: ticketBrand, value: M.bag() } },
    exit: M.any(),
  });

  /** a seat for allocating proceeds of sales */
  const proceeds = zcf.makeEmptySeatKit().zcfSeat;

  /** @type {OfferHandler} */
  const tradeHandler = buyerSeat => {
    // give and want are guaranteed by Zoe to match proposalShape
    const { give, want } = buyerSeat.getProposal();

    // check that we have enough inventory
    AmountMath.isGTE(
      inventorySeat.getCurrentAllocation().Tickets,
      want.Tickets,
    ) || Fail`Not enough inventory, ${q(want.Tickets)} wanted`;

    // check that user is paying enough for all the tickets
    const totalPrice = bagPrice(want.Tickets.value, inventory);
    AmountMath.isGTE(give.Price, totalPrice) ||
      Fail`Total price is ${q(totalPrice)}, but ${q(give.Price)} was given`;

    atomicRearrange(
      zcf,
      harden([
        // price from buyer to proceeds
        [buyerSeat, proceeds, { Price: totalPrice }],
        // tickets from inventory to buyer
        [inventorySeat, buyerSeat, want],
      ]),
    );

    buyerSeat.exit(true);
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
