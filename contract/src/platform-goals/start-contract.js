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
 *   issuerNames?: string[];
 * }} opts
 *
 * @typedef {Partial<Parameters<Awaited<BootstrapPowers['consume']['startUpgradable']>>[0]>} StartArgs
 */
export const startContract = async (
  powers,
  { name, startArgs, issuerNames },
) => {
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

  if (issuerNames) {
    /** @type {BootstrapPowers & import('./board-aux.core').BoardAuxPowers} */
    // @ts-expect-error cast
    const auxPowers = powers;

    const { zoe, brandAuxPublisher } = auxPowers.consume;
    const { produce: produceIssuer } = auxPowers.issuer;
    const { produce: produceBrand } = auxPowers.brand;
    const { brands, issuers } = await E(zoe).getTerms(instance);

    await Promise.all(
      issuerNames.map(async issuerName => {
        const brand = brands[issuerName];
        const issuer = issuers[issuerName];
        console.log('CoreEval script: share via agoricNames:', brand);

        produceBrand[issuerName].reset();
        produceIssuer[issuerName].reset();
        produceBrand[issuerName].resolve(brand);
        produceIssuer[issuerName].resolve(issuer);

        await E(brandAuxPublisher).publishBrandInfo(brand);
      }),
    );
  }

  return started;
};
