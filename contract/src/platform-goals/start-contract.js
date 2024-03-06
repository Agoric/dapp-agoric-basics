/**
 * @file core eval script* to start typical contracts.
 */
// @ts-check

import { E } from '@endo/far';

/**
 * @param {BootstrapPowers} powers
 * @param {{ name: string, bundleID: string }} opts
 */
export const installContract = async (
  { consume: { zoe }, installation: { produce: produceInstallation } },
  { name, bundleID },
) => {
  const installation = await E(zoe).installBundleID(bundleID);
  produceInstallation[name].reset();
  produceInstallation[name].resolve(installation);
  console.log(name, 'installed as', bundleID.slice(0, 8));
  return installation;
};

/**
 * @param {BootstrapPowers} powers
 * @param {{
 *   name: string;
 *   startArgs?: StartArgs;
 * }} opts
 *
 * @typedef {Partial<Parameters<Awaited<BootstrapPowers['consume']['startUpgradable']>>[0]>} StartArgs
 */
export const startContract = async (powers, { name, startArgs }) => {
  const {
    consume: { startUpgradable },
    installation: { consume: consumeInstallation },
    instance: { produce: produceInstance },
  } = powers;

  const installation = await consumeInstallation[name];

  console.log(name, 'start args:', startArgs);
  const started = await E(startUpgradable)({
    ...startArgs,
    installation,
    label: name,
  });
  const { instance } = started;
  produceInstance[name].reset();
  produceInstance[name].resolve(instance);

  console.log(name, 'started');
  return started;
};
