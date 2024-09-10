// @ts-check
import { allValues } from './objectTools.js';
import {
  AmountMath,
  installContract,
  startContract,
} from './platform-goals/start-contract.js';

const { Fail } = assert;

const contractName = '_CONTRACT_NAME_'; // for pattern match
const IST_UNIT = 1_000_000n;

/**
 * Core eval script to start contract
 *
 * @param {BootstrapPowers } permittedPowers
 * @param {*} config
 *
 */
export const deployContract = async (permittedPowers, config) => {
  console.log('core eval for', contractName);
  const {
    // must be supplied by caller or template-replaced
    bundleID = Fail`no bundleID`,
  } = config?.options?.[contractName] ?? {};

  const installation = await installContract(permittedPowers, {
    name: contractName,
    bundleID,
  });

  await startContract(permittedPowers, {
    name: contractName,
    startArgs: {
      installation,
    },
  });

  console.log(contractName, '(re)started');
};

/** @type { import("@agoric/vats/src/core/lib-boot.js").BootstrapManifestPermit } */
export const permit = harden({
  consume: {
    startUpgradable: true, // to start contract and save adminFacet
  },
  installation: {
    consume: { [contractName]: true },
    produce: { [contractName]: true },
  },
  instance: { produce: { [contractName]: true } },
  // generate issuer/brand
});

export const main = deployContract;
