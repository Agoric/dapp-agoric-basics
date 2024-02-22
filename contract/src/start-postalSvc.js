/**
 * @file core eval script* to start the postalSvc contract.
 *
 * The `permit` export specifies the corresponding permit.
 */
// @ts-check

import { E } from '@endo/far';
import { fixHub } from './fixHub.js';

const trace = (...args) => console.log('start-postalSvc', ...args);

const { Fail } = assert;

/**
 * @typedef { typeof import('../src/postalSvc.js').start } PostalSvcFn
 *
 * @typedef {{
 *   produce: { postalSvcKit: Producer<unknown> },
 *   installation: {
 *     consume: { postalSvc: Promise<Installation<PostalSvcFn>> },
 *     produce: { postalSvc: Producer<Installation<PostalSvcFn>> },
 *   }
 *   instance: {
 *     consume: { postalSvc: Promise<StartedInstanceKit<PostalSvcFn>['instance']> },
 *     produce: { postalSvc: Producer<StartedInstanceKit<PostalSvcFn>['instance']> },
 *   }
 * }} PostalSvcPowers
 */

/**
 * @param {BootstrapPowers} powers
 * @param {{ options?: { postalSvc: {
 *   bundleID: string;
 *   issuerNames?: string[];
 * }}}} [config]
 */
export const startPostalSvc = async (powers, config) => {
  /** @type { BootstrapPowers & PostalSvcPowers} */
  // @ts-expect-error bootstrap powers evolve with BLD staker governance
  const postalPowers = powers;
  const {
    consume: { zoe, namesByAddressAdmin, agoricNames },
    installation: {
      produce: { postalSvc: produceInstallation },
    },
    instance: {
      produce: { postalSvc: produceInstance },
    },
  } = postalPowers;
  const {
    bundleID = Fail`no bundleID`,
    issuerNames = ['IST', 'Invitation', 'BLD', 'ATOM'],
  } = config?.options?.postalSvc ?? {};

  /** @type {Installation<PostalSvcFn>} */
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

  trace('postalSvc started');
};

export const manifest = /** @type {const} */ ({
  [startPostalSvc.name]: {
    consume: {
      agoricNames: true,
      namesByAddress: true,
      namesByAddressAdmin: true,
      zoe: true,
    },
    installation: {
      produce: { postalSvc: true },
    },
    instance: {
      produce: { postalSvc: true },
    },
  },
});

export const permit = Object.values(manifest)[0];

export const main = startPostalSvc;
