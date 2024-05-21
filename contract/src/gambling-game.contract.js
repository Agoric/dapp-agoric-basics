// @ts-check

/*
The contract is a gambling game where the 14th person to send IST to the contract wins all IST in the contract. It demonstrates how to prevent a forceful send of IST and why the order of operations in a function are important.
This is a simple example of the dangers of a smart contracts and why testing and auditing are important. All developers have bugs in their code and it is only a matter of time until they are found.
Once the winner is decided, they can claim the reward which transfers all the IST to their wallet. The game starts all over again and the contract does not end. 
*/

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { atomicRearrange } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import { Far } from '@endo/far';

const start = zcf => {
    const { zcfSeat: contractSeat } = zcf.makeEmptySeatKit();

    const MAX_ENTRIES = 14;
    let entries = [];

    const depositInvitation = zcf.makeInvitation(async seat => {

        // Ensure the player only sends IST
        const offerAmount = seat.getAmountAllocated('IST');


        if (!offerAmount.brand) {
            throw new Error('Only IST is accepted');
        }

        // Coerce the amount to the correct brand
        const depositAmount = AmountMath.coerce(
            zcf.getBrandForIssuer(zcf.getIssuerForBrand(offerAmount.brand)),
            offerAmount
        );
        if (!depositAmount) {
            throw new Error('Only IST is accepted');
        }

        // Prevent reentrancy attacks by updating state before making external calls
        entries.push(seat);

        // Transfer funds from player to contract
        atomicRearrange(
            zcf,
            harden([
                [seat, contractSeat, { IST: depositAmount }],
            ]),
        );

        // Check if the game is over
        if (entries.length === MAX_ENTRIES) {

            // Select the winner
            const winnerSeat = entries[MAX_ENTRIES - 1];

            // Payout the winner
            const payoutAmount = contractSeat.getAmountAllocated('IST');
            atomicRearrange(
                zcf,
                harden([
                    [contractSeat, winnerSeat, { IST: payoutAmount }],
                ]),
            );
            winnerSeat.exit();
            entries = []; // Reset the game
        } else {
            seat.exit();
        }
    }, 'Deposit IST');

    return {
        publicFacet: Far('publicFacet', {
            makeDepositInvitation: () => depositInvitation,
            getEntriesCount: () => entries.length,
        },)
    };
};

harden(start);
export { start };
