// @ts-check
import { allValues } from './objectTools.js';
import {
  AmountMath,
  installContract,
  startContract,
} from './platform-goals/start-contract.js';

const { Fail } = assert;

const contractName = 'sellConcertTickets';
const IST_UNIT = 1_000_000n;

export const makeInventory = (brand, baseUnit) => {
  return {
    frontRow: {
      tradePrice: AmountMath.make(brand, baseUnit * 3n),
      maxTickets: 3n,
    },
    middleRow: {
      tradePrice: AmountMath.make(brand, baseUnit * 2n),
      maxTickets: 3n,
    },
    lastRow: {
      tradePrice: AmountMath.make(brand, baseUnit * 1n),
      maxTickets: 3n,
    },
  };
};

export const makeTerms = (brand, baseUnit) => {
  return {
    inventory: makeInventory(brand, baseUnit),
  };
};

/**
 * Core eval script to start contract
 *
 * @param {BootstrapPowers } permittedPowers
 * @param {*} config
 *
 * @typedef {{
 *   brand: PromiseSpaceOf<{ Ticket: Brand }>;
 *   issuer: PromiseSpaceOf<{ Ticket: Issuer }>;
 * }} SellTicketsSpace
 */
export const startSellConcertTicketsContract = async (
  permittedPowers,
  config,
) => {
  console.log('core eval for', contractName);
  const {
    // must be supplied by caller or template-replaced
    bundleID = Fail`no bundleID`,
  } = config?.options?.[contractName] ?? {};

  const installation = await installContract(permittedPowers, {
    name: contractName,
    bundleID,
  });

  const ist = await allValues({
    brand: permittedPowers.brand.consume.IST,
    issuer: permittedPowers.issuer.consume.IST,
  });

  const terms = makeTerms(ist.brand, 1n * IST_UNIT);

  await startContract(permittedPowers, {
    name: contractName,
    startArgs: {
      installation,
      issuerKeywordRecord: { Price: ist.issuer },
      terms,
    },
    issuerNames: ['Ticket'],
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
  issuer: { consume: { IST: true }, produce: { Ticket: true } },
  brand: { consume: { IST: true }, produce: { Ticket: true } },
});

export const main = startSellConcertTicketsContract;
