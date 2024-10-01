/**
 * @file core eval script* to start the postalService contract.
 *
 * * see rollup.config.mjs to make a script from this file.
 *
 * The `permit` export specifies the corresponding permit.
 */
// @ts-check

import { fixHub } from './fixHub.js';
import {
  installContract,
  startContract,
} from './platform-goals/start-contract.js';

/** @import {BootstrapManifest} from '@agoric/vats/src/core/lib-boot.js'; */
const { Fail } = assert;

const contractName = 'postalService';

/**
 * @param {BootstrapPowers} powers
 * @param {{ options?: { postalService: {
 *   bundleID: string;
 * }}}} [config]
 */
export const startPostalService = async (powers, config) => {
  const {
    consume: { namesByAddressAdmin },
  } = powers;
  const {
    // must be supplied by caller or template-replaced
    bundleID = Fail`no bundleID`,
  } = config?.options?.[contractName] ?? {};

  const installation = await installContract(powers, {
    name: contractName,
    bundleID,
  });

  const namesByAddress = await fixHub(namesByAddressAdmin);
  const terms = harden({ namesByAddress });

  await startContract(powers, {
    name: contractName,
    startArgs: { installation, terms },
  });
};

/** @type {BootstrapManifest} */
export const manifest = {
  [startPostalService.name]: {
    consume: {
      agoricNames: true,
      namesByAddress: true,
      namesByAddressAdmin: true,
      startUpgradable: true,
      zoe: true,
    },
    installation: {
      produce: { postalService: true },
      consume: { postalService: true },
    },
    instance: {
      produce: { postalService: true },
    },
  },
};

export const permit = Object.values(manifest)[0];

export const main = startPostalService;
