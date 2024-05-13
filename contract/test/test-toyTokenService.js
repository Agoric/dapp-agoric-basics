/**
 * @file Test Toy Token exchange contract.
 */
// @ts-check

import { test as anyTest } from './prepare-test-env-ava.js';
import { E } from '@endo/far';
import { makeZoeKitForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';

import { startToyTokenExchangeContract, makeTerms, permit } from '../src/toy-tokens-service.proposal.js';

/** @typedef {typeof import('../src/toy-tokens-service.contract.js').start} ToyTokenContractFn */

const contractPath = '../src/toy-tokens-service.contract.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

/**
 * Prepare the testing context, setting up Zoe and other resources
 * @param {unknown} _t
 */
const makeTestContext = async _t => {
  const { zoeService: zoe } = makeZoeKitForTest();
  const bundleCache = await makeNodeBundleCache('bundles/', {}, s => import(s));
  const bundle = await bundleCache.load(contractPath, 'toyTokenContract');

  return { zoe, bundle, bundleCache };
};

test.before(async t => (t.context = await makeTestContext(t)));

/**
 * Test if the Toy Token contract installs successfully
 */
test('Install the Toy Token contract', async t => {
  const { zoe, bundle } = t.context;
  const installation = await E(zoe).install(bundle);
  t.log(installation);
  t.is(typeof installation, 'object');
});

/**
 * Test if the Toy Token contract starts successfully
 */
test('Start the Toy Token contract', async t => {
  const { zoe, bundle } = t.context;

  const toyToken = makeIssuerKit('ToyToken');
  const issuers = { ToyToken: toyToken.issuer };
  const terms = makeTerms(toyToken.brand, 100000n);
  t.log('terms:', terms);

  /** @type {ERef<Installation<ToyTokenContractFn>>} */
  const installation = E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(installation, issuers, terms);
  t.log(instance);
  t.is(typeof instance, 'object');
});

/**
 * Simulate a token transfer from Alice to Bob
 * @param {import('ava').ExecutionContext} t
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<import('@agoric/zoe/src/zoeService/utils').Instance<ToyTokenContractFn>>} instance
 * @param {Purse} alicePurse
 * @param {bigint} amountToSend
 */
const aliceToBobTransfer = async (t, zoe, instance, alicePurse, amountToSend) => {
  const publicFacet = E(zoe).getPublicFacet(instance);

  // Define a proposal where Alice will send tokens to Bob
  const proposal = {
    give: { ToyToken: AmountMath.make(alicePurse.getCurrentAmount().brand, amountToSend) },
    want: {},
  };

  const payment = await E(alicePurse).withdraw(proposal.give.ToyToken);
  t.log('Alice gives', proposal.give);

  // Make an exchange invitation
  const invitation = E(publicFacet).makeExchangeInvitation();

  const seat = E(zoe).offer(invitation, proposal, { ToyToken: payment });
  const result = await E(seat).getOfferResult();
  t.is(result, 'Exchange completed successfully');
};

/**
 * Test exchanging tokens between Alice and Bob
 */
test('Alice sends tokens to Bob', async t => {
  const { zoe, bundle } = t.context;

  // Set up ToyToken issuer
  const toyToken = makeIssuerKit('ToyToken');
  const issuers = { ToyToken: toyToken.issuer };
  const terms = makeTerms(toyToken.brand, 100000n);

  /** @type {ERef<Installation<ToyTokenContractFn>>} */
  const installation = E(zoe).install(bundle);
  const { instance } = await E(zoe).startInstance(installation, issuers, terms);

  // Create a purse for Alice
  const alicePurse = toyToken.issuer.makeEmptyPurse();
  const initialTokens = AmountMath.make(toyToken.brand, 1000n);
  const alicePayment = toyToken.mint.mintPayment(initialTokens);
  alicePurse.deposit(alicePayment);

  // Alice sends 500 tokens to Bob
  await aliceToBobTransfer(t, zoe, instance, alicePurse, 500n);
});
