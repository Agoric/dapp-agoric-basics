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

/** @import { BootstrapManifestPermit } from "@agoric/vats/src/core/lib-boot.js"; */

const { Fail } = assert;

const contractName = 'swaparoo';

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

  const {
    consume: {
      board,
      chainTimerService,
      namesByAddressAdmin: namesByAddressAdminP,
      zoe,
      chainStorage,
    },
    produce,
    brand: {
      consume: { IST: istBrandP },
    },
    installation,
    instance: { produce: produceInstance },
  } = powers;

  const installationP = installation.consume[contractName];
  const contractGovernor = installation.consume.contractGovernor;
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
      committeeCreatorFacet: E.get(
        powers.consume[`${contractName}CommitteeKit`],
      ).creatorFacet,
    },
  );
  produce[`${contractName}Kit`].resolve(it);
  await E(
    E.get(powers.consume[`${contractName}CharterKit`]).creatorFacet,
  ).addInstance(it.instance, it.governorCreatorFacet);

  console.log('CoreEval script: started contract', contractName, it.instance);

  console.log('CoreEval script: share via agoricNames: none');

  produceInstance[contractName].reset();
  produceInstance[contractName].resolve(it.instance);

  console.log(`${contractName} (re)started`);
};

/**
 * @param {BootstrapPowers} permittedPowers
 * @param {*} config
 */
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

/** @type { BootstrapManifestPermit } */
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
