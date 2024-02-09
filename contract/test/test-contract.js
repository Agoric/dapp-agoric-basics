/**
 * @file Test basic trading using the agoric basics contract.
 */
// @ts-check

/* eslint-disable import/order -- https://github.com/endojs/endo/issues/1235 */
import { test as anyTest } from './prepare-test-env-ava.js';

import { createRequire } from 'module';
import { E, Far } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';
import { makeCopyBag } from '@endo/patterns';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { makeZoeKitForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';

import { makeStableFaucet } from './mintStable.js';
import { startAgoricBasicsContract } from '../src/agoric-basics-proposal.js';
import { hasInventory, bagPrice } from '../src/agoric-basics.contract.js';

/** @typedef {typeof import('../src/agoric-basics.contract.js').start} AssetContractFn */

const myRequire = createRequire(import.meta.url);
const contractPath = myRequire.resolve(`../src/agoric-basics.contract.js`);

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const UNIT6 = 1_000_000n;
const CENT = UNIT6 / 100n;

/**
 * Tests assume access to the zoe service and that contracts are bundled.
 *
 * See test-bundle-source.js for basic use of bundleSource().
 * Here we use a bundle cache to optimize running tests multiple times.
 *
 * @param {unknown} _t
 */
const makeTestContext = async _t => {
  const { zoeService: zoe, feeMintAccess } = makeZoeKitForTest();

  const bundleCache = await makeNodeBundleCache('bundles/', {}, s => import(s));
  const bundle = await bundleCache.load(contractPath, 'assetContract');

  return { zoe, bundle, bundleCache, feeMintAccess };
};

test.before(async t => (t.context = await makeTestContext(t)));

test('hasInventory works', async t => {
  const money = makeIssuerKit('PlayMoney');
  const inventory = {
    a: { tradePrice: AmountMath.make(money.brand, 1n), maxTickets: 1n },
  };
  const enough = makeCopyBag([['a', 1n]]);
  const notEnough = makeCopyBag([
    ['a', 1n],
    ['b', 2n],
  ]);
  t.true(hasInventory(enough, inventory));
  t.false(hasInventory(notEnough, inventory));
});

test('bagPrice works', async t => {
  const money = makeIssuerKit('PlayMoney');
  const inventory = {
    a: { tradePrice: AmountMath.make(money.brand, 1n), maxTickets: 3n },
    b: { tradePrice: AmountMath.make(money.brand, 2n), maxTickets: 3n },
    c: { tradePrice: AmountMath.make(money.brand, 3n), maxTickets: 3n },
  };
  const bag = makeCopyBag([
    ['a', 1n],
    ['b', 2n],
    ['c', 3n],
  ]);
  t.true(
    AmountMath.isEqual(
      bagPrice(bag, inventory),
      AmountMath.make(money.brand, 14n),
    ),
  );
});

// IDEA: use test.serial and pass work products
// between tests using t.context.

test('Install the contract', async t => {
  const { zoe, bundle } = t.context;

  const installation = await E(zoe).install(bundle);
  t.log(installation);
  t.is(typeof installation, 'object');
});

test('Start the contract', async t => {
  const { zoe, bundle } = t.context;

  const money = makeIssuerKit('PlayMoney');
  const issuers = { Price: money.issuer };
  const terms = {
    inventory: {
      frontRow: {
        tradePrice: AmountMath.make(money.brand, 3n),
        maxTickets: 3n,
      },
    },
  };
  t.log('terms:', terms);

  /** @type {ERef<Installation<AssetContractFn>>} */
  const installation = E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(installation, issuers, terms);
  t.log(instance);
  t.is(typeof instance, 'object');
});

/**
 * Alice trades by paying the price from the contract's terms.
 *
 * @param {import('ava').ExecutionContext} t
 * @param {ZoeService} zoe
 * @param {ERef<import('@agoric/zoe/src/zoeService/utils').Instance<AssetContractFn>} instance
 * @param {Purse} purse
 * @param {string[]} choices
 */
const alice = async (
  t,
  zoe,
  instance,
  purse,
  choices = ['frontRow', 'middleRow'],
) => {
  const publicFacet = E(zoe).getPublicFacet(instance);
  // @ts-expect-error Promise<Instance> seems to work
  const terms = await E(zoe).getTerms(instance);
  const { issuers, brands } = terms;

  const choiceBag = makeCopyBag(choices.map(name => [name, 1n]));
  const totalPrice = bagPrice(choiceBag, terms.inventory);
  const proposal = {
    give: { Price: totalPrice },
    want: { Tickets: AmountMath.make(brands.Ticket, choiceBag) },
  };
  const pmt = await E(purse).withdraw(totalPrice);
  t.log('Alice gives', proposal.give);

  const toTrade = E(publicFacet).makeTradeInvitation();

  const seat = E(zoe).offer(toTrade, proposal, { Price: pmt });
  const tickets = await E(seat).getPayout('Tickets');

  const actual = await E(issuers.Ticket).getAmountOf(tickets);
  t.log('Alice payout brand', actual.brand);
  t.log('Alice payout value', actual.value);
  t.deepEqual(actual, proposal.want.Tickets);
};

const makeTerms = (brand, baseUnit) => {
  return {
    inventory: {
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
    },
  };
};

test('Alice trades: give some play money, want tickets', async t => {
  const { zoe, bundle } = t.context;

  const money = makeIssuerKit('PlayMoney');
  const issuers = { Price: money.issuer };
  const terms = makeTerms(money.brand, 1n);

  /** @type {ERef<Installation<AssetContractFn>>} */
  const installation = E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(installation, issuers, terms);
  t.log(instance);
  t.is(typeof instance, 'object');

  const alicePurse = money.issuer.makeEmptyPurse();
  const amountOfMoney = AmountMath.make(money.brand, 10n);
  const moneyPayment = money.mint.mintPayment(amountOfMoney);
  alicePurse.deposit(moneyPayment);
  await alice(t, zoe, instance, alicePurse);
});

test('Trade in IST rather than play money', async t => {
  /**
   * Start the contract, providing it with
   * the IST issuer.
   *
   * @param {{ zoe: ZoeService, bundle: {} }} powers
   */
  const startContract = async ({ zoe, bundle }) => {
    /** @type {ERef<Installation<AssetContractFn>>} */
    const installation = E(zoe).install(bundle);
    const feeIssuer = await E(zoe).getFeeIssuer();
    const feeBrand = await E(feeIssuer).getBrand();
    const terms = makeTerms(feeBrand, 5n * CENT);
    return E(zoe).startInstance(installation, { Price: feeIssuer }, terms);
  };

  const { zoe, bundle, bundleCache, feeMintAccess } = t.context;
  const { instance } = await startContract({ zoe, bundle });
  const { faucet } = makeStableFaucet({ bundleCache, feeMintAccess, zoe });
  await alice(t, zoe, instance, await faucet(5n * UNIT6));
});

test('use the code that will go on chain to start the contract', async t => {
  const noop = harden(() => {});

  // Starting the contract consumes an installation
  // and produces an instance, brand, and issuer.
  // We coordinate these with promises.
  const makeProducer = () => ({ ...makePromiseKit(), reset: noop });
  const sync = {
    installation: makeProducer(),
    instance: makeProducer(),
    brand: makeProducer(),
    issuer: makeProducer(),
  };

  /**
   * Chain bootstrap makes a number of powers available
   * to code approved by BLD staker governance.
   *
   * Here we simulate the ones needed for starting this contract.
   */
  const mockBootstrap = async () => {
    const board = { getId: noop };
    const chainStorage = Far('chainStorage', {
      makeChildNode: async () => chainStorage,
      setValue: async () => {},
    });

    const { zoe } = t.context;
    const startUpgradable = async ({
      installation,
      issuerKeywordRecord,
      label,
      terms,
    }) =>
      E(zoe).startInstance(installation, issuerKeywordRecord, terms, {}, label);
    const feeIssuer = await E(zoe).getFeeIssuer();
    const feeBrand = await E(feeIssuer).getBrand();

    const pFor = x => Promise.resolve(x);
    const powers = {
      consume: { zoe, chainStorage, startUpgradable, board },
      brand: {
        consume: { IST: pFor(feeBrand) },
        produce: { Ticket: sync.brand },
      },
      issuer: {
        consume: { IST: pFor(feeIssuer) },
        produce: { Ticket: sync.issuer },
      },
      installation: { consume: { agoricBasics: sync.installation.promise } },
      instance: { produce: { agoricBasics: sync.instance } },
    };
    return powers;
  };

  const powers = await mockBootstrap();

  // Code to install the contract is automatically
  // generated by `agoric run`. No need to test that part.
  const { zoe, bundle } = t.context;
  const installation = E(zoe).install(bundle);
  sync.installation.resolve(installation);

  // When the BLD staker governance proposal passes,
  // the startup function gets called.
  await startAgoricBasicsContract(powers);
  const instance = await sync.instance.promise;

  // Now that we have the instance, resume testing as above.
  const { feeMintAccess, bundleCache } = t.context;
  const { faucet } = makeStableFaucet({ bundleCache, feeMintAccess, zoe });
  await alice(t, zoe, instance, await faucet(5n * UNIT6));
});
