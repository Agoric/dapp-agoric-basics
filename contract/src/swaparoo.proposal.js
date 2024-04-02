// @ts-check
import { E } from '@endo/far';
import {
  AmountMath,
  installContract,
} from './platform-goals/start-contract.js';
import {
  ParamTypes,
  startMyCharter,
  startMyCommittee,
  startMyGovernedInstance,
} from './platform-goals/start-governed-contract.js';
import { allValues } from './objectTools.js';

const { Fail } = assert;

const contractName = 'swaparoo';

/**
 * @template SF
 * @typedef {import('@agoric/zoe/src/zoeService/utils').StartResult<SF>} StartResult<SF>
 */

/**
 * @typedef {PromiseSpaceOf<{
 *   swaparooKit: GovernanceFacetKit<typeof import('./swaparoo.contract').start>;
 *   swaparooCommitteeKit: StartResult<*>;
 *   swaparooCharterKit: StartResult<*>;
 * }> & {
 *   installation: PromiseSpaceOf<{ swaparoo: Installation }>;
 *   instance: PromiseSpaceOf<{ swaparoo: Instance }>;
 * }} SwaparooSpace
 */

/**
 * @param {BootstrapPowers} powers
 * @param {*} config
 */
export const startSwaparooCharter = (powers, config) =>
  startMyCharter(contractName, powers, config);

/**
 * @param {BootstrapPowers} powers
 * @param {*} config
 */
export const startSwaparooCommittee = (powers, config) =>
  startMyCommittee(contractName, powers, config);

/**
 * @param {BootstrapPowers} powers
 * @param {*} config
 */
export const installSwapContract = async (powers, config) => {
  const {
    // must be supplied by caller or template-replaced
    bundleID = Fail`no bundleID`,
  } = config?.options?.[contractName] ?? {};

  return installContract(powers, {
    name: contractName,
    bundleID,
  });
};

/**
 * Core eval script to start contract
 *
 * @param {BootstrapPowers} powers
 */
export const startSwapContract = async powers => {
  console.error(contractName, 'startContract()...');
  /** @type { BootstrapPowers & SwaparooSpace} */
  // @ts-expect-error bootstrap powers evolve with BLD staker governance
  const swapPowers = powers;
  const {
    consume: {
      board,
      chainTimerService,
      namesByAddressAdmin: namesByAddressAdminP,
      zoe,
      [`${contractName}CommitteeKit`]: committeeKitP,
      [`${contractName}CharterKit`]: charterKitP,
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
  const { chainStorage } = powers.consume;

  const istBrand = await istBrandP;
  const oneIST = AmountMath.make(istBrand, 1n);
  const namesByAddressAdmin = await namesByAddressAdminP;

  const governedParams = {
    Fee: {
      type: ParamTypes.AMOUNT,
      value: oneIST,
    },
  };

  // TODO: push more of the formulaic stuff down to startMyGovernedInstance
  const marshaller = await E(board).getPublishingMarshaller();
  const storageNode = await E(chainStorage).makeChildNode(contractName);
  const it = await startMyGovernedInstance(
    {
      zoe,
      governedContractInstallation: installationP,
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
  await E(E.get(charterKitP).creatorFacet).addInstance(
    it.instance,
    it.governorCreatorFacet,
  );

  console.log('CoreEval script: started contract', contractName, it.instance);

  console.log('CoreEval script: share via agoricNames: none');

  produceInstance.reset();
  produceInstance.resolve(it.instance);

  console.log(`${contractName} (re)started`);
};

export const main = (
  permittedPowers,
  config = {
    options: Fail`missing options config`,
  },
) =>
  allValues({
    installation: installSwapContract(permittedPowers, config),
    committeeFacets: startSwaparooCommittee(permittedPowers, config),
    contractFacets: startSwapContract(permittedPowers),
    charterFacets: startSwaparooCharter(permittedPowers, config),
  });

/** @type { import("@agoric/vats/src/core/lib-boot").BootstrapManifestPermit } */
export const permit = harden({
  consume: {
    namesByAddress: true,
    namesByAddressAdmin: true, // to convert string addresses to depositFacets
    startUpgradable: true,
    swaparooCharterKit: true,

    swaparooCommitteeKit: true,
    board: true, // for to marshal governance parameter values
    chainStorage: true, // to publish governance parameter values
    chainTimerService: true, // to manage vote durations
    zoe: true, // to start governed contract (TODO: use startUpgradable?)
  },
  produce: {
    swaparooKit: true,
    swaparooCommitteeKit: true,
    swaparooCharterKit: true,
  },
  installation: {
    consume: {
      [contractName]: true,
      contractGovernor: true,
      committee: true,
      binaryVoteCounter: true,
      econCommitteeCharter: true,
    },
    produce: { [contractName]: true },
  },
  instance: {
    produce: {
      [contractName]: true,
      [`${contractName}Charter`]: true,
      [`${contractName}Committee`]: true,
    },
  },
  brand: {
    consume: {
      IST: true, // for use in contract terms
    },
  },
});
