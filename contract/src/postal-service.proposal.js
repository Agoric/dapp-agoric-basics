/**
 * @file core eval script* to start the postalService contract.
 *
 * * see rollup.config.mjs to make a script from this file.
 *
 * The `permit` export specifies the corresponding permit.
 */
// @ts-check

import { E } from '@endo/far';
import { fixHub } from './fixHub.js';

const { Fail } = assert;

/**
 * @typedef { typeof import('./postal-service.contract.js').start } PostalServiceFn
 *
 * @typedef {{
 *   produce: { postalServiceKit: Producer<unknown> },
 *   installation: {
 *     consume: { postalService: Promise<Installation<PostalServiceFn>> },
 *     produce: { postalService: Producer<Installation<PostalServiceFn>> },
 *   }
 *   instance: {
 *     consume: { postalService: Promise<StartedInstanceKit<PostalServiceFn>['instance']> },
 *     produce: { postalService: Producer<StartedInstanceKit<PostalServiceFn>['instance']> },
 *   }
 * }} PostalServicePowers
 */

/**
 * @param {BootstrapPowers} powers
 * @param {{ options?: { postalService: {
 *   bundleID: string;
 *   issuerNames?: string[];
 * }}}} [config]
 */
export const startPostalService = async (powers, config) => {
  /** @type { BootstrapPowers & PostalServicePowers} */
  // @ts-expect-error bootstrap powers evolve with BLD staker governance
  const postalPowers = powers;
  const {
    consume: { zoe, namesByAddressAdmin, agoricNames },
    installation: {
      produce: { postalService: produceInstallation },
    },
    instance: {
      produce: { postalService: produceInstance },
    },
  } = postalPowers;
  const {
    // separate line for bundling
    bundleID = Fail`no bundleID`,
    issuerNames = ['IST', 'Invitation', 'BLD', 'ATOM'],
  } = config?.options?.postalService ?? {};

  /** @type {Installation<PostalServiceFn>} */
  const installation = await E(zoe).installBundleID(bundleID);
  produceInstallation.resolve(installation);

  const namesByAddress = await fixHub(namesByAddressAdmin);

  // XXX ATOM isn't available via consume.issuer.ATOM. Odd.
  const issuers = Object.fromEntries(
    issuerNames.map(n => [n, E(agoricNames).lookup('issuer', n)]),
  );
  const { instance } = await E(zoe).startInstance(installation, issuers, {
    namesByAddress,
  });
  produceInstance.resolve(instance);

  console.log('postalService started');
};

export const manifest = /** @type {const} */ ({
  [startPostalService.name]: {
    consume: {
      agoricNames: true,
      namesByAddress: true,
      namesByAddressAdmin: true,
      zoe: true,
    },
    installation: {
      produce: { postalService: true },
    },
    instance: {
      produce: { postalService: true },
    },
  },
});

export const permit = Object.values(manifest)[0];

export const main = startPostalService;
