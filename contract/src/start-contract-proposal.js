// @ts-check
import { E } from '@endo/far';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';

console.warn('start-contract-proposal.js module evaluating');

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
export const installContract = async (powers, config) => {
  console.log('installContract() ...', contractName);
  /** @type { BootstrapPowers & SwaparooSpace} */
  // @ts-expect-error cast
  const swapPowers = powers;
  const { bundleID = Fail`missing bundleID` } =
    config.options?.[contractName] || {};
  const {
    consume: { zoe },
    installation: {
      produce: { [contractName]: produceInstallation },
    },
  } = swapPowers;

  const installation = await E(zoe).installBundleID(bundleID);
  produceInstallation.reset();
  produceInstallation.resolve(installation);
  console.log(contractName, '(re)installed');
};

/**
 * Core eval script to start contract
 *
 * @param {BootstrapPowers} permittedPowers
 */
export const startContract = async permittedPowers => {
  console.error('startContract()...');
  /** @type { BootstrapPowers & SwaparooSpace} */
  // @ts-expect-error bootstrap powers evolve with BLD staker governance
  const swapPowers = permittedPowers;
  const {
    consume: { startUpgradable, namesByAddressAdmin: namesByAddressAdminP },
    brand: {
      consume: { IST: istBrandP },
    },
    installation: {
      consume: { [contractName]: installationP },
    },
    instance: {
      produce: { [contractName]: produceInstance },
    },
  } = swapPowers;

  const istBrand = await istBrandP;
  // NOTE: TODO all terms for the contract go here
  const oneIST = AmountMath.make(istBrand, 1n);
  const namesByAddressAdmin = await namesByAddressAdminP;
  const terms = { feeAmount: oneIST, namesByAddressAdmin };

  const installation = await installationP;

  const { instance } = await E(startUpgradable)({
    installation,
    label: contractName,
    terms,
  });
  console.log('CoreEval script: started game contract', instance);
  // const {} = await E(zoe).getTerms(instance);

  console.log('CoreEval script: share via agoricNames: none');

  produceInstance.reset();
  produceInstance.resolve(instance);

  console.log(`${contractName} (re)started`);
};

/** @type { import("@agoric/vats/src/core/lib-boot").BootstrapManifest } */
const contractManifest = {
  [startContract.name]: {
    consume: {
      startUpgradable: true,
      namesByAddressAdmin: true, // to convert string addresses to depositFacets
    },
    installation: { consume: { [contractName]: true } },
    instance: { produce: { [contractName]: true } },
    brand: {
      consume: {
        IST: true, // for use in contract terms
      },
    },
  },
};
harden(contractManifest);

export const getManifestForContract = (
  { restoreRef },
  { [`${contractName}Ref`]: contractRef },
) => {
  console.log('manifest ref', contractName, contractRef);
  return harden({
    manifest: contractManifest,
    installations: {
      [contractName]: restoreRef(contractRef),
    },
  });
};
