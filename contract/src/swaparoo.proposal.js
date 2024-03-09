// @ts-check
import {
  AmountMath,
  installContract,
  startContract,
} from './platform-goals/start-contract.js';

const { Fail } = assert;

const contractName = 'swaparoo';

/**
 * @typedef {{
 *   installation: PromiseSpaceOf<{ swaparoo: Installation }>;
 *   instance: PromiseSpaceOf<{ swaparoo: Instance }>;
 * }} SwaparooSpace
 */

/**
 * Core eval script to install contract
 *
 * @param {BootstrapPowers} powers
 * @param {*} config
 */
export const installSwapContract = async (powers, config) => {
  const {
    // must be supplied at runtime or replaced in template fashion
    bundleID = Fail`missing bundleID`,
  } = config.options?.[contractName] || {};

  await installContract(powers, { name: contractName, bundleID });
};

/**
 * Core eval script to start contract
 *
 * @param {BootstrapPowers} powers
 */
export const startSwapContract = async powers => {
  console.error('startContract()...');
  /** @type { BootstrapPowers & SwaparooSpace} */
  // @ts-expect-error bootstrap powers evolve with BLD staker governance
  const swapPowers = powers;
  const {
    consume: { namesByAddressAdmin: namesByAddressAdminP },
    brand: {
      consume: { IST: istBrandP },
    },
  } = swapPowers;

  const istBrand = await istBrandP;
  const oneIST = AmountMath.make(istBrand, 1n);
  const namesByAddressAdmin = await namesByAddressAdminP;
  const terms = { feeAmount: oneIST, namesByAddressAdmin };

  return startContract(powers, { name: contractName, startArgs: { terms } });
};

export const main = async (powers, config = {}) => {
  await installSwapContract(powers, config);
  await startSwapContract(powers);
};

/** @type { import("@agoric/vats/src/core/lib-boot").BootstrapManifestPermit } */
export const permit = {
  consume: {
    startUpgradable: true,
    namesByAddressAdmin: true, // to convert string addresses to depositFacets
    zoe: true, // to install the contract
  },
  installation: {
    produce: { [contractName]: true },
    consume: { [contractName]: true },
  },
  instance: { produce: { [contractName]: true } },
  brand: {
    consume: {
      IST: true, // for use in contract terms
    },
  },
};
harden(permit);
