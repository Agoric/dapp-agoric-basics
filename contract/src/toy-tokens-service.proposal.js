// @ts-check
import { allValues } from './objectTools.js';
import {
  AmountMath,
  installContract,
  startContract,
} from './platform-goals/start-contract.js';

const { Fail } = assert;

const contractName = 'toyTokenExchange';
const IST_UNIT = 1n; // You can customize this unit as needed

/**
 * Function to create terms for the Toy Token contract
 * @param {Brand} brand The brand of the toy token
 * @param {bigint} totalSupply The total supply of the toy token
 * @returns {{ totalSupply: Amount }}
 */
export const makeTerms = (brand, totalSupply) => {
  return {
    totalSupply: AmountMath.make(brand, totalSupply),
  };
};

/**
 * Core evaluation script to start the Toy Token contract
 *
 * @param {BootstrapPowers } permittedPowers
 * @param {*} config
 *
 * @typedef {{
 *   brand: PromiseSpaceOf<{ ToyToken: Brand }>;
 *   issuer: PromiseSpaceOf<{ ToyToken: Issuer }>;
 *   instance: PromiseSpaceOf<{ toyTokenExchange: Instance }>
 * }} ToyTokenSpace
 */
export const startToyTokenExchangeContract = async (permittedPowers, config) => {
  console.log('Core eval for', contractName);
  const {
    // must be supplied by the caller or template-replaced
    bundleID = Fail`No bundleID provided`,
  } = config?.options?.[contractName] ?? {};

  const installation = await installContract(permittedPowers, {
    name: contractName,
    bundleID,
  });

  const toyToken = await allValues({
    brand: permittedPowers.brand.consume.IST,
    issuer: permittedPowers.issuer.consume.IST,
  });

  // Define the terms for the contract
  const terms = makeTerms(toyToken.brand, 100000n * IST_UNIT); // Adjust total supply as needed

  await startContract(permittedPowers, {
    name: contractName,
    startArgs: {
      installation,
      issuerKeywordRecord: { ToyToken: toyToken.issuer },
      terms,
    },
    issuerNames: ['ToyToken'],
  });

  console.log(contractName, '(re)started');
};

/** @type { import("@agoric/vats/src/core/lib-boot").BootstrapManifestPermit } */
export const permit = harden({
  consume: {
    agoricNames: true,
    brandAuxPublisher: true,
    startUpgradable: true, // to start contract and save adminFacet
    zoe: true, // to get contract terms, including issuer/brand
  },
  installation: {
    consume: { [contractName]: true },
    produce: { [contractName]: true },
  },
  instance: { produce: { [contractName]: true } },
  issuer: { consume: { ToyToken: true }, produce: { ToyToken: true } },
  brand: { consume: { ToyToken: true }, produce: { ToyToken: true } },
});

export const main = startToyTokenExchangeContract;
