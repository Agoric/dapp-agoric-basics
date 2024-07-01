import { Far } from '@endo/far';
import { AssetKind, AmountMath } from '@agoric/ertp';
import { atomicRearrange } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import '@agoric/zoe/exported.js';

/**
 * Start a contract that:
 *   - creates a new fungible asset type for Toy Tokens,
 *   - handles offers to exchange tokens.
 *
 * @param {ZCF} zcf Zoe Contract Facet
 */
export const start = async zcf => {
  const toyTokenMint = await zcf.makeZCFMint('ToyToken', AssetKind.SET);
  const { brand: toyTokenBrand } = toyTokenMint.getIssuerRecord();

  // Mint the fixed total supply of Toy Tokens
  const totalSupply = 100000n;  // Adjust total supply as needed
  const { zcfSeat: adminSeat } = zcf.makeEmptySeatKit();

  toyTokenMint.mintGains({ ToyToken: AmountMath.make(toyTokenBrand, totalSupply) }, adminSeat);
  adminSeat.exit();

  /**
   * Handler for token exchange offers
   * @param {Seat} seat A Zoe seat for the offer
   */
  const exchangeHandler = seat => {
    const { give, want } = seat.getProposal();
    // Ensure that both sides are trading Toy Tokens
    AmountMath.isGTE(give.ToyToken, want.ToyToken);
    atomicRearrange(
      zcf,
      harden([
        [seat, seat, { ToyToken: give.ToyToken }],
      ]),
    );
    seat.exit();
    return 'Exchange completed successfully';
  };

  /**
   * Make an invitation for exchanging Toy Tokens.
   */
  const makeExchangeInvitation = () =>
    zcf.makeInvitation(exchangeHandler, 'Exchange Toy Tokens');

  const publicFacet = Far('Toy Token Public Facet', {
    makeExchangeInvitation,
    getBrand: () => toyTokenBrand,
  });

  return harden({ publicFacet });
};

harden(start);
