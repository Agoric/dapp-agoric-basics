// @ts-check

/* eslint-disable import/order -- https://github.com/endojs/endo/issues/1235 */
import { test as anyTest } from './prepare-test-env-ava.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { createRequire } from 'module';
import { E } from '@endo/far';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { makeZoeKitForTest } from '@agoric/zoe/tools/setup-zoe.js';

const myRequire = createRequire(import.meta.url);
const contractPath = myRequire.resolve(`../src/gambling-game.contract.js`);

const test = anyTest;


const makeTestContext = async _t => {
  try {
    const { zoeService: zoe, feeMintAccess } = makeZoeKitForTest();
    const bundleCache = await makeNodeBundleCache(
      'bundles/',
      {},
      nodeModuleSpecifier => import(nodeModuleSpecifier),
    );
    const bundle = await bundleCache.load(contractPath, 'gambling-game');

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

test.skip('Install Gambling Game contract', async t => {
  try {
    // @ts-ignore
    const { zoe, bundle } = t.context;

    const installation = await E(zoe).install(bundle);
    t.log(installation);
    t.is(typeof installation, 'object');
  } catch (error) {
    console.error('Error in Install Gambling Game contract test:', error);
    t.fail(error.message);
  }
});

test.skip('Start Gambling Game contract', async t => {
  try {
    // @ts-ignore
    const { zoe, bundle } = t.context;

    const installation = await E(zoe).install(bundle);
    const { instance } = await E(zoe).startInstance(installation);
    t.log(instance);
    t.is(typeof instance, 'object');
  } catch (error) {
    console.error('Error in Start Gambling Game contract test:', error);
    t.fail(error.message);
  }
});

test('Make a deposit', async t => {
  try {
    // @ts-ignore
    const { zoe, bundle } = t.context;

    const installation = await E(zoe).install(bundle);
    const { issuer, mint, brand } = makeIssuerKit('IST');
    const { publicFacet } = await E(zoe).startInstance(installation, { IST: issuer });
    
    const aliceAmount = AmountMath.make(brand, 100n);
    const alicePayment = mint.mintPayment(aliceAmount);

    const aliceInvitation = E(publicFacet).makeDepositInvitation();
    const proposal = { give: { IST: aliceAmount } };
    const payments = { IST: alicePayment };

    const seat = await E(zoe).offer(aliceInvitation, proposal, payments);
    t.log(seat);
    t.is(typeof seat, 'object');
  } catch (error) {
    console.error('Error in Make a deposit test:', error);
    t.fail(error.message);
  }
});

test('Get the number of entries', async t => {
  try {
    // @ts-ignore
    const { zoe, bundle } = t.context;

    const installation = await E(zoe).install(bundle);
    const { issuer, brand, mint } = makeIssuerKit('IST');
    const { publicFacet } = await E(zoe).startInstance(installation, { IST: issuer });
    
    const entriesCount = await E(publicFacet).getEntriesCount();
    t.log(entriesCount);
    t.is(typeof entriesCount, 'number');

    const aliceAmount = AmountMath.make(brand, 100n);
    const alicePayment = mint.mintPayment(aliceAmount);

    const aliceInvitation = E(publicFacet).makeDepositInvitation();
    const proposal = { give: { IST: aliceAmount } };
    const payments = { IST: alicePayment };

    await E(zoe).offer(aliceInvitation, proposal, payments);
    const newEntriesCount = await E(publicFacet).getEntriesCount();
    t.log(newEntriesCount);
    t.is(newEntriesCount, entriesCount + 1);
    
  } catch (error) {
    console.error('Error in Get the number of entries test:', error);
    t.fail(error.message);
  }
});