// @ts-check
import { E } from '@endo/far';
// import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import {
  installContract,
  startContract,
} from './platform-goals/start-contract.js';

const { Fail } = assert;

console.warn('start proposal module evaluating');

const contractName = 'sellConcertTickets';
const IST_UNIT = 1_000_000n;

// avoid bundling from other packages
const AmountMath = {
  make: (brand, value) => harden({ brand, value }),
};

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
  console.error('startSellConcertTicketsContract()...');
  /** @type {BootstrapPowers & SellTicketsSpace & import('./platform-goals/boardAux').BoardAuxPowers} */
  // @ts-expect-error cast
  const sellPowers = permittedPowers;
  const {
    consume: { brandAuxPublisher, zoe },
    brand: {
      consume: { IST: istBrandP },
      produce: { Ticket: produceTicketBrand },
    },
    issuer: {
      consume: { IST: istIssuerP },
      produce: { Ticket: produceTicketIssuer },
    },
  } = sellPowers;
  const {
    // separate line for bundling
    bundleID = Fail`no bundleID`,
  } = config?.options?.[contractName] ?? {};

  const istIssuer = await istIssuerP;
  const istBrand = await istBrandP;

  const terms = makeTerms(istBrand, 1n * IST_UNIT);

  const installation = await installContract(permittedPowers, {
    name: contractName,
    bundleID,
  });

  const { instance } = await startContract(permittedPowers, {
    name: contractName,
    startArgs: {
      installation,
      issuerKeywordRecord: { Price: istIssuer },
      terms,
    },
  });

  const {
    brands: { Ticket: brand },
    issuers: { Ticket: issuer },
  } = await E(zoe).getTerms(instance);

  console.log('CoreEval script: share via agoricNames:', brand);

  produceTicketBrand.reset();
  produceTicketIssuer.reset();
  produceTicketBrand.resolve(brand);
  produceTicketIssuer.resolve(issuer);

  await E(brandAuxPublisher).publishBrandInfo(brand);
  console.log('sellConcertTickets (re)started');
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
