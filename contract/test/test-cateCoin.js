import { test as anyTest } from './prepare-test-env-ava.js';
import { createRequire } from 'module';
import { E } from '@endo/far';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { makeZoeKitForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { AmountMath } from '@agoric/ertp';

const myRequire = createRequire(import.meta.url);
const contractPath = myRequire.resolve(`../src/cateCoin.contract.js`);

const test = anyTest;

const makeTestContext = async _t => {
  try {
    const { zoeService: zoe, feeMintAccess } = makeZoeKitForTest();
    const bundleCache = await makeNodeBundleCache(
      'bundles/',
      {},
      nodeModuleSpecifier => import(nodeModuleSpecifier),
    );
    const bundle = await bundleCache.load(contractPath, 'cateCoinContract');

    await E(zoe).install(bundle);

    return { zoe, bundle, bundleCache, feeMintAccess };
  } catch (error) {
    console.error('Error in makeTestContext:', error);
    throw error;
  }
};

test.before(async t => {
  try {
    t.context = await makeTestContext(t);
  } catch (error) {
    console.error('Error in test.before:', error);
    throw error;
  }
});

test('Install CateCoin contract', async t => {
  try {
    const { zoe, bundle } = t.context;

    const installation = await E(zoe).install(bundle);
    t.log(installation);
    t.is(typeof installation, 'object');
  } catch (error) {
    console.error('Error in Install CateCoin contract test:', error);
    t.fail(error.message);
  }
});

test('Start CateCoin contract', async t => {
  try {
    const { zoe, bundle } = t.context;

    const installation = await E(zoe).install(bundle);
    const { instance } = await E(zoe).startInstance(installation);
    t.log(instance);
    t.is(typeof instance, 'object');
  } catch (error) {
    console.error('Error in Start CateCoin contract test:', error);
    t.fail(error.message);
  }
});

test('createInitialCoins creates a fixed amount of initial CateCoin', async t => {
  try {
    const { zoe, bundle } = t.context;

    const installation = await E(zoe).install(bundle);
    const { creatorFacet } = await E(zoe).startInstance(installation);

    const cateIssuer = await E(creatorFacet).getIssuer();
    const cateBrand = await E(cateIssuer).getBrand();

    const myPurse = await E(cateIssuer).makeEmptyPurse();

    await E(creatorFacet).createInitialCoins(myPurse, 100n);

    const amnt = await myPurse.getCurrentAmount();
    const amnt2 = AmountMath.make(cateBrand, 100n);
    t.true(AmountMath.isEqual(amnt, amnt2));
  } catch (error) {
    console.error('Error in createInitialCoins test:', error);
    t.fail(error.message);
  }
});

test('createInitialCoins CateCoin more than maxSupply', async t => {
  try {
    const { zoe, bundle } = t.context;

    const installation = await E(zoe).install(bundle);
    const { creatorFacet } = await E(zoe).startInstance(installation);

    const cateIssuer = await E(creatorFacet).getIssuer();
    const cateBrand = await E(cateIssuer).getBrand();
    const myPurse = await E(cateIssuer).makeEmptyPurse();

    await E(creatorFacet).createInitialCoins(myPurse, 1000_001n);

    const amnt = await myPurse.getCurrentAmount();
    const amnt2 = AmountMath.make(cateBrand, 0n);
    t.true(AmountMath.isEqual(amnt, amnt2));
  } catch (error) {
    console.error(
      'Error in createInitialCoins more than maxSupply test:',
      error,
    );
    t.fail(error.message);
  }
});

test('transferCateCoins two purses', async t => {
  try {
    const { zoe, bundle } = t.context;

    const installation = await E(zoe).install(bundle);
    const { creatorFacet } = await E(zoe).startInstance(installation);

    const cateIssuer = await E(creatorFacet).getIssuer();
    const cateBrand = cateIssuer.getBrand();
    const fromPurse = await E(cateIssuer).makeEmptyPurse();
    await E(creatorFacet).createInitialCoins(fromPurse, 1000n);
    const toPurse = await E(cateIssuer).makeEmptyPurse();
    await E(creatorFacet).transferCateCoins(fromPurse, toPurse, 500n);

    const fromAmnt = await fromPurse.getCurrentAmount();
    const toAmnt = await toPurse.getCurrentAmount();
    t.true(AmountMath.isEqual(fromAmnt, AmountMath.make(cateBrand, 500n)));
    t.true(AmountMath.isEqual(toAmnt, AmountMath.make(cateBrand, 500n)));
  } catch (error) {
    console.error('Error in transferCateCoins two purses test:', error);
    t.fail(error.message);
  }
});

test('transferCateCoins more than sender has', async t => {
  try {
    const { zoe, bundle } = t.context;

    const installation = await E(zoe).install(bundle);
    const { creatorFacet } = await E(zoe).startInstance(installation);

    const cateIssuer = await E(creatorFacet).getIssuer();
    const cateBrand = cateIssuer.getBrand();
    const fromPurse = await E(cateIssuer).makeEmptyPurse();
    await E(creatorFacet).createInitialCoins(fromPurse, 1000n);
    const toPurse = await E(cateIssuer).makeEmptyPurse();
    await E(creatorFacet).transferCateCoins(fromPurse, toPurse, 500n);
    await E(creatorFacet).transferCateCoins(fromPurse, toPurse, 501n);

    const fromAmnt = await fromPurse.getCurrentAmount();
    const toAmnt = await toPurse.getCurrentAmount();
    t.true(AmountMath.isEqual(fromAmnt, AmountMath.make(cateBrand, 500n)));
    t.true(AmountMath.isEqual(toAmnt, AmountMath.make(cateBrand, 500n)));
  } catch (error) {
    console.error(
      'Error in transferCateCoins more than sender has test:',
      error,
    );
    t.fail(error.message);
  }
});
