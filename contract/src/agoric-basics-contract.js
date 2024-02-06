// @ts-check
import { AmountMath, AmountShape, AssetKind } from '@agoric/ertp';
import { Far } from '@endo/far';
import '@agoric/zoe/exported.js';
import { M } from '@endo/patterns';
import { atomicRearrange } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';

const { Fail, quote: q } = assert;

/**
 * @param {ZCF<{joinPrice: Amount}>} zcf
 */
export const start = async zcf => {
  const gameSeat = zcf.makeEmptySeatKit().zcfSeat;
  // TODO: convert to COPY_BAG
  const ticketMint = await zcf.makeZCFMint('Ticket', AssetKind.NAT);

  const joinShape = harden({
    give: { Price: AmountShape },
    want: { Tickets: AmountShape },
    exit: M.any(),
  });

  /** @param {ZCFSeat} playerSeat */
  const joinHandler = playerSeat => {
    const { give, want } = playerSeat.getProposal();

    // TODO: update the checks here once AssetKind is converted to COPY_BAG
    AmountMath.isGTE(
      AmountMath.make(ticketMint.getIssuerRecord().brand, 1n),
      want.Tickets,
    ) || Fail`${q(want.Tickets)} exceeds 1n ticket`;

    // mintGains mints all amounts in `want`
    // For more, see reference:
    //   https://docs.agoric.com/reference/zoe-api/zcfmint.html#azcfmint-mintgains-gains-zcfseat
    const tmp = ticketMint.mintGains(want);
    // atomicRearrange rearrange the assets between seats
    atomicRearrange(
      zcf,
      harden([
        [playerSeat, gameSeat, give],
        // TODO: add another TransferPart below to pass the exercise 3 test
        [tmp, playerSeat, want],
      ]),
    );

    playerSeat.exit(true);
    return 'welcome to the game';
  };

  const publicFacet = Far('API', {
    makeJoinInvitation: () =>
      zcf.makeInvitation(joinHandler, 'join', undefined, joinShape),
  });

  return { publicFacet };
};
harden(start);
