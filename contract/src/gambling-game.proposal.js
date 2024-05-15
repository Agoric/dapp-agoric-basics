import { E } from '@endo/far';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { makeZoeKit } from '@agoric/zoe';
// import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin';
import { start } from './gambling-game.contract.js';

const contractName = 'gambling-game';

const startGame = async () => {
    const { zoeService } = makeZoeKit(null);

    // Create IST issuer and mint
    const { issuer, mint, brand } = makeIssuerKit('IST');

    // Install the contract code
    const installation = await E(zoeService).install(start);

    // Start the instance
    const { publicFacet } = await E(zoeService).startInstance(installation, { IST: issuer });

    // Mint some IST to test with
    const aliceAmount = AmountMath.make(brand, 100n);
    const alicePayment = mint.mintPayment(aliceAmount);

    const aliceInvitation = E(publicFacet).makeDepositInvitation();
    const proposal = { give: { IST: aliceAmount } };
    const payments = { IST: alicePayment };

    // Make an offer to deposit IST
    const seat = await E(zoeService).offer(aliceInvitation, proposal, payments);
    console.log('Alice made a deposit.', seat);

    // Check the number of entries
    const entriesCount = await E(publicFacet).getEntriesCount();
    console.log(`Current number of entries: ${entriesCount}`);
};

// Define a manifest object describing the contract's capabilities and permissions
export const manifest = /** @type {const} */ ({
    [startGame.name]: {
        // Define entry for the postalService contract
        consume: {
            // Resources consumed by the contract
            agoricNames: true, // Needs access to the agoricNames registry
            namesByAddress: true, // Needs access to the namesByAddress registry
            namesByAddressAdmin: true, // Needs administrative access to the namesByAddress registry
            startUpgradable: true, // Allows upgrades to the contract
            zoe: true, // Needs access to the Zoe service for contract execution
        },
        installation: {
            // Capabilities provided by the contract during installation
            consume: { [contractName]: true },
            produce: { [contractName]: true },
        },
        instance: {
            // Capabilities provided by the contract instance
            produce: { [contractName]: true }, // Produces a "postalService" instance
        },
    },
});

// Define the permit object based on the manifest
export const permit = Object.values(manifest)[0];
export const main = startGame;