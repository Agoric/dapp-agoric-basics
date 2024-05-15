import { createRequire } from 'module';
import { E } from '@endo/far';

import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { makeZoeKitForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { AmountMath } from '@agoric/ertp';
// Imports various modules needed for the tests.

// import { makeStableFaucet } from './mintStable.js';
// import {
//   startSellConcertTicketsContract,
//   makeInventory,
//   makeTerms,
//   permit,
// } from '../src/sell-concert-tickets.proposal.js';
// import { start } from '../src/cateCoin.contract.js';
// import { getBundleId } from '../tools/bundle-tools.js';
// import { mockBootstrapPowers } from './boot-tools.js';
// import {
//   produceBoardAuxManager,
//   permit as boardAuxPermit,
// } from '../src/platform-goals/board-aux.core.js';
// import { extract } from '@agoric/vats/src/core/utils.js';
// Imports modules and functions for specific test scenarios.
import { test as anyTest } from './prepare-test-env-ava.js';

const myRequire = createRequire(import.meta.url);
const contractPath = myRequire.resolve(`../src/cateCoin.contract.js`);

const test = anyTest;
// Renames the imported 'test' function for use in the file.

const makeTestContext = async _t => {
  // Defines a function to create test context.
  const { zoeService: zoe, feeMintAccess } = makeZoeKitForTest();
  // Creates a Zoe service kit for testing.

  const bundleCache = await makeNodeBundleCache(
    'bundles/',
    {},
    nodeModuleSpecifier => import(nodeModuleSpecifier),
  );
  // Creates a node bundle cache instance with the specified options and import function.
  const bundle = await bundleCache.load(contractPath, 'assetContract');

  E(zoe).install(bundle);
  // Installs the contract bundle on Zoe.
  //const { instance } = await E(zoe).startInstance(installation);
  return { zoe, bundle, bundleCache, feeMintAccess };
  // Returns the test context containing Zoe service, contract bundle, bundle cache, and fee mint access.
};

test.before(async t => (t.context = await makeTestContext(t)));
// Executes setup function before tests and assigns the context to 't'.

test('Install CateCoin contract', async t => {
  // Defines a test case to install the sell concert tickets contract.
  const { zoe, bundle } = t.context;
  // Destructures Zoe service and contract bundle from test context.

  const installation = await E(zoe).install(bundle);
  // Installs the contract bundle on Zoe.
  t.log(installation);
  // Logs the installation details.
  t.is(typeof installation, 'object');
  // Asserts that the installation is an object.
});

test('Start CateCoin contract', async t => {
  // Defines a test case to start contract.
  const { zoe, bundle } = t.context;
  // Destructures Zoe service and contract bundle from test context.

  const installation = E(zoe).install(bundle);
  // Installs the contract bundle on Zoe.
  const { instance } = await E(zoe).startInstance(installation);
  // Starts a new contract instance on Zoe.
  t.log(instance);
  // Logs the contract instance.
  t.is(typeof instance, 'object');
  // Asserts that the contract instance is an object.
});

test('createInitialCoins creates a fixed amount of initial CateCoin', async t => {
  // Defines a test case to calculate the total price for a bag of tickets.
  const { zoe, bundle } = t.context;

  //Does not work here -
  const installation = E(zoe).install(bundle);
  const { instance, creatorFacet } = await E(zoe).startInstance(installation);

  const cateIssuer = await E(creatorFacet).getIssuer();
  const cateBrand = await E(cateIssuer).getBrand();

  const myPurse = await E(cateIssuer).makeEmptyPurse();

  const coins = await E(creatorFacet).createInitialCoins(myPurse, 100n);

  // Creates a bag of tickets with different rows and quantities.
  const amnt = await myPurse.getCurrentAmount();
  const amnt2 = AmountMath.make(cateBrand, 100n);
  t.true(AmountMath.isEqual(amnt, amnt2));
  // Asserts that the calculated bag price matches the expected total price.
});

test('createInitialCoins CateCoin more than maxSupply', async t => {
  // Defines a test case to calculate the total price for a bag of tickets.
  const { zoe, bundle } = t.context;
  const installation = E(zoe).install(bundle);
  const { instance, creatorFacet } = await E(zoe).startInstance(installation);

  const cateIssuer = await E(creatorFacet).getIssuer();
  const cateBrand = await E(cateIssuer).getBrand();
  const myPurse = await E(cateIssuer).makeEmptyPurse();

  const coins = await E(creatorFacet).createInitialCoins(myPurse, 1000_001n);

  // Creates a bag of tickets with different rows and quantities.
  const amnt = await myPurse.getCurrentAmount();
  const amnt2 = AmountMath.make(cateBrand, 0n);
  t.true(AmountMath.isEqual(amnt, amnt2));
  // Asserts that the calculated bag price matches the expected total price.
});

test('transferCateCoins two purses', async t => {
  // Defines a test case to calculate the total price for a bag of tickets.
  const { zoe, bundle } = t.context;

  //Does not work here -
  const installation = E(zoe).install(bundle);
  const { instance, creatorFacet } = await E(zoe).startInstance(installation);

  const cateIssuer = await E(creatorFacet).getIssuer();
  const fromPurse = await E(cateIssuer).makeEmptyPurse();
  await E(creatorFacet).createInitialCoins(fromPurse, 1000n);
  const toPurse = await E(cateIssuer).makeEmptyPurse();
  await E(creatorFacet).transferCateCoins(fromPurse, toPurse, 500n);
  // Creates a bag of tickets with different rows and quantities.
  const fromAmnt = await fromPurse.getCurrentAmount();
  const toAmnt = await toPurse.getCurrentAmount();
  t.true(AmountMath.isEqual(fromAmnt, toAmnt));
});
test('transferCateCoins more than sender has', async t => {
  // Defines a test case to calculate the total price for a bag of tickets.
  const { zoe, bundle } = t.context;

  //Does not work here -
  const installation = E(zoe).install(bundle);
  const { instance, creatorFacet } = await E(zoe).startInstance(installation);

  const cateIssuer = await E(creatorFacet).getIssuer();
  const fromPurse = await E(cateIssuer).makeEmptyPurse();
  await E(creatorFacet).createInitialCoins(fromPurse, 1000n);
  const toPurse = await E(cateIssuer).makeEmptyPurse();
  await E(creatorFacet).transferCateCoins(fromPurse, toPurse, 500n);
  await E(creatorFacet).transferCateCoins(fromPurse, toPurse, 501n);
  // Creates a bag of tickets with different rows and quantities.
  const fromAmnt = await fromPurse.getCurrentAmount();
  const toAmnt = await toPurse.getCurrentAmount();
  t.true(AmountMath.isEqual(fromAmnt, toAmnt));
});
