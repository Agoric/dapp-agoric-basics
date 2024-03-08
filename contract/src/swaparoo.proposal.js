// @ts-check
import { E } from '@endo/far';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import { ParamTypes } from '@agoric/governance/src/constants.js';
import { startMyGovernedInstance } from './platform-goals/start-governed-contract.js';

const { Fail } = assert;

const contractName = 'swaparoo';

/** @template SF @typedef {import('@agoric/zoe/src/zoeService/utils').StartResult<SF>} StartResult<SF> */

/**
 * @typedef {PromiseSpaceOf<{
 *   swaparooKit: StartResult<*>;
 *   swaparooCommitteeKit: StartResult<*>;
 * }> & {
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
  return installation;
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
    consume: {
      board,
      chainTimerService,
      namesByAddressAdmin: namesByAddressAdminP,
      zoe,
      [`${contractName}CommitteeKit`]: committeeKitP,
    },
    produce: { [`${contractName}Kit`]: produceContractKit },
    brand: {
      consume: { IST: istBrandP },
    },
    installation: {
      consume: { [contractName]: installationP, contractGovernor },
    },
    instance: {
      produce: { [contractName]: produceInstance },
    },
  } = swapPowers;
  /** @type {import('./types').NonNullChainStorage['consume']} */
  // @ts-expect-error
  const { chainStorage } = permittedPowers.consume;

  const istBrand = await istBrandP;
  const oneIST = AmountMath.make(istBrand, 1n);
  const namesByAddressAdmin = await namesByAddressAdminP;

  const installation = await installationP;

  const governedParams = {
    Fee: {
      type: ParamTypes.AMOUNT,
      value: oneIST,
    },
  };

  const marshaller = await E(board).getPublishingMarshaller();
  const storageNode = await E(chainStorage).makeChildNode(contractName);
  const it = await startMyGovernedInstance(
    {
      zoe,
      governedContractInstallation: installation,
      label: contractName,
      terms: {},
      privateArgs: {
        storageNode,
        marshaller,
        namesByAddressAdmin,
      },
    },
    {
      governedParams,
      timer: chainTimerService,
      contractGovernor,
      governorTerms: {},
      committeeCreatorFacet: E.get(committeeKitP).creatorFacet,
    },
  );
  produceContractKit.resolve(it);

  console.log('CoreEval script: started contract', contractName, it.instance);
  // const {} = await E(zoe).getTerms(instance);

  console.log('CoreEval script: share via agoricNames: none');

  produceInstance.reset();
  produceInstance.resolve(it.instance);

  console.log(`${contractName} (re)started`);
};

/** @type { import("@agoric/vats/src/core/lib-boot").BootstrapManifestPermit } */
export const permit = harden({
  consume: {
    namesByAddressAdmin: true, // to convert string addresses to depositFacets

    swaparooCommitteeKit: true,
    board: true, // for to marshal governance parameter values
    chainStorage: true, // to publish governance parameter values
    chainTimerService: true, // to manage vote durations
    zoe: true, // to start governed contract (TODO: use startUpgradable?)
  },
  produce: {
    swaparooKit: true,
    swaparooCommitteeKit: true,
  },
  installation: {
    consume: {
      [contractName]: true,
      contractGovernor: true,
    },
  },
  instance: { produce: { [contractName]: true } },
  brand: {
    consume: {
      IST: true, // for use in contract terms
    },
  },
});
