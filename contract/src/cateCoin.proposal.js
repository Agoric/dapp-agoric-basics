import {
  installContract,
  startContract,
} from './platform-goals/start-contract.js';
import { allValues } from './objectTools.js';

// const { Fail } = assert;

const contractName = 'cateCoin';

/**
 * Core eval script to start contract
 *
 * @param {BootstrapPowers} permittedPowers
 * @param {*} config
 */

export const startCateCoin = async (powers, config) => {
  console.log('core eval for', contractName);
  // const {
  //   bundleID = Fail`no bundleID`,
  // } = config?.options?.[contractName] ?? {};
  const bundleID = config?.options?.[contractName] ?? {};
  try {
    const installation = await installContract(powers, {
      name: contractName,
      bundleID,
    });

    const ist = await allValues({
      brand: powers.brand.consume.IST,
      issuer: powers.issuer.consume.IST,
    });

    const terms = undefined;

    await startContract(powers, {
      name: contractName,
      startArgs: {
        installation,
        issuerKeywordRecord: { Price: ist.issuer },
        terms,
      },
      issuerNames: ['Ticket'],
    });

    console.log(contractName, '(re)started');
  } catch (error) {
    console.error(`Error starting ${contractName} contract:`, error);
    throw error; // Rethrow the error after logging it
  }
};

// Define a manifest object describing the contract's capabilities and permissions
export const manifest = /** @type {const} */ ({
  [startCateCoin.name]: {
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

export const main = startCateCoin;
