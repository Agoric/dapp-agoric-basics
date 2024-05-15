// @ts-check

/*
The contract is a gambling game where the 14th person to send IST to the contract wins all IST in the contract. It demonstrates how to prevent a forceful send of IST and why the order of operations in a function are important.
This is a simple example of the dangers of a smart contracts and why testing and auditing are important. All developers have bugs in their code and it is only a matter of time until they are found.
Once the winner is decided, they can claim the reward which transfers all the IST to their wallet. The game starts all over again and the contract does not end. 
*/

import { AmountMath } from '@agoric/ertp';
import { makeNotifierKit } from '@agoric/notifier';

const start = zcf => {
  const { zcfSeat: contractSeat } = zcf.makeEmptySeatKit();

  const MAX_ENTRIES = 14;
  let entries = [];
  const { notifier, updater } = makeNotifierKit();

  const depositInvitation = zcf.makeInvitation(async seat => {
    const offerAmount = seat.getAmountAllocated('IST');
    const depositAmount = AmountMath.coerce(zcf.getBrandForIssuer(zcf.getIssuerForBrand(offerAmount.brand)), offerAmount);
    
    // Prevent reentrancy attacks by updating state before making external calls
    entries.push(seat);
    
    if (entries.length === MAX_ENTRIES) {
      const winnerSeat = entries[MAX_ENTRIES - 1];
      const payoutAmount = contractSeat.getAmountAllocated('IST');
      contractSeat.decrementBy(contractSeat.getCurrentAllocation());
      winnerSeat.incrementBy(payoutAmount);

      zcf.reallocate(contractSeat, winnerSeat);

      winnerSeat.exit();
      entries = []; // Reset the game
    } else {
      seat.exit();
    }

    updater.updateState(entries.length);

    // Transfer funds from player to contract
    contractSeat.incrementBy(depositAmount);
    zcf.reallocate(contractSeat, seat);
  }, 'Deposit IST');

  return {
    publicFacet: {
      makeDepositInvitation: () => depositInvitation,
      getEntriesNotifier: () => notifier,
      getEntriesCount: () => entries.length,
    },
  };
};

harden(start);
export { start };
