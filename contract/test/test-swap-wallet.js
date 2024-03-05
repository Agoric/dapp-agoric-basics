// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { createRequire } from 'node:module';
import { E } from '@endo/far';
import { AmountMath } from '@agoric/ertp';

import { mockBootstrapPowers } from './boot-tools.js';
import { installContract, startContract } from '../src/swaparoo.proposal.js';
import { makeStableFaucet } from './mintStable.js';
import { mockWalletFactory, seatLike } from './wallet-tools.js';
import { getBundleId, makeBundleCacheContext } from './bundle-tools.js';

/** @typedef {import('./wallet-tools.js').MockWallet} MockWallet */

/** @type {import('ava').TestFn<Awaited<ReturnType<makeBundleCacheContext>>>} */
const test = anyTest;

const nodeRequire = createRequire(import.meta.url);

const contractName = 'swaparoo';
const assets = {
  [contractName]: nodeRequire.resolve(`../src/${contractName}.contract.js`),
};

test.before(async t => (t.context = await makeBundleCacheContext(t)));

test.serial('bootstrap and start contract', async t => {
  t.log('bootstrap');
  const { powers, vatAdminState } = await mockBootstrapPowers(t.log);

  const { bundleCache } = t.context;
  const bundle = await bundleCache.load(assets.swaparoo, contractName);
  const bundleID = getBundleId(bundle);
  t.log('publish bundle', bundleID.slice(0, 8));
  vatAdminState.installBundle(bundleID, bundle);

  t.log('install contract');
  const config = { options: { [contractName]: { bundleID } } };
  await installContract(powers, config); // `agoric run` style proposal does this for us
  t.log('start contract');
  await startContract(powers);

  const instance = await powers.instance.consume[contractName];
  t.log(instance);
  t.is(typeof instance, 'object');

  Object.assign(t.context.shared, { powers });
});

/**
 * @param {import('ava').ExecutionContext} t
 * @param {*} wellKnown
 * @param {MockWallet} wallet
 * @param {Amount} beansAmount
 * @param {Amount} cowsAmount
 * @param {string} depositAddress
 * @param {boolean} [alicePays]
 */
const startAlice = async (
  t,
  wellKnown,
  wallet,
  beansAmount,
  cowsAmount,
  depositAddress,
  alicePays = true,
) => {
  const instance = wellKnown.instance[contractName];

  // Let's presume the terms are in vstorage somewhere... say... boardAux
  const terms = wellKnown.terms.get(instance);
  const { feeAmount } = terms;

  const proposal = {
    give: { MagicBeans: beansAmount, Fee: feeAmount },
    want: {
      Cow: cowsAmount,
      ...(alicePays ? {} : { Refund: feeAmount }),
    },
  };

  /** @type {import('@agoric/smart-wallet/src/offers.js').OfferSpec} */
  const offerSpec = {
    id: 'alice-swap-1',
    invitationSpec: {
      source: 'contract',
      instance,
      publicInvitationMaker: 'makeFirstInvitation',
      invitationArgs: [[wellKnown.issuer.BLD, wellKnown.issuer.IST]],
    },
    proposal,
    offerArgs: { addr: depositAddress },
  };
  t.snapshot(offerSpec, 'alice makes offer');

  const updates = E(wallet.offers).executeOffer(offerSpec);
  return updates;
};

/**
 * @param {import('ava').ExecutionContext} t
 * @param {*} wellKnown
 * @param {MockWallet} wallet
 * @param {Amount} beansAmount
 * @param {Amount} cowsAmount
 * @param {boolean} [jackPays]
 */
const startJack = async (
  t,
  wellKnown,
  wallet,
  beansAmount,
  cowsAmount,
  jackPays = false,
) => {
  const instance = wellKnown.instance[contractName];
  const terms = wellKnown.terms.get(instance);
  const { feeAmount } = terms;

  const proposal = {
    want: { MagicBeans: beansAmount },
    give: {
      Cow: cowsAmount,
      ...(jackPays ? { Refund: feeAmount } : {}),
    },
  };

  /** @type {import('@agoric/smart-wallet/src/offers.js').OfferSpec} */
  const offerSpec = {
    id: 'jack-123',
    invitationSpec: {
      source: 'purse',
      instance,
      description: 'matchOffer',
    },
    proposal,
  };
  t.snapshot(offerSpec, 'jack makes offer');

  return E(wallet.offers).executeOffer(offerSpec);
};

test.serial('basic swap', async t => {
  const ONE_IST = 1_000_000n;
  const addr = {
    alice: 'agoric1alice',
    jack: 'agoric1jack',
  };

  const {
    shared: { powers },
    bundleCache,
  } = t.context;

  const { zoe, feeMintAccess, bldIssuerKit } = powers.consume;
  const instance = await powers.instance.consume[contractName];
  // TODO: we presume terms are available... perhaps in boardAux
  const terms = await E(zoe).getTerms(instance);

  // A higher fidelity test would get these from vstorage
  const wellKnown = {
    brand: {
      IST: await powers.brand.consume.IST,
      BLD: await powers.brand.consume.BLD,
    },
    issuer: {
      IST: await powers.issuer.consume.IST,
      BLD: await powers.issuer.consume.BLD,
      Invitation: await E(zoe).getInvitationIssuer(),
    },
    instance: {
      [contractName]: instance,
    },
    terms: new Map([[instance, terms]]),
  };

  const beans = x => AmountMath.make(wellKnown.brand.IST, x);
  const fiveBeans = beans(5n);

  const cowAmount = AmountMath.make(
    wellKnown.brand.BLD,
    //   makeCopyBag([['Milky White', 1n]]),
    10n,
  );

  const { mintBrandedPayment } = makeStableFaucet({
    bundleCache,
    feeMintAccess,
    zoe,
  });
  const bldPurse = E(E.get(bldIssuerKit).issuer).makeEmptyPurse();
  await E(bldPurse).deposit(
    await E(E.get(bldIssuerKit).mint).mintPayment(cowAmount),
  );

  const walletFactory = mockWalletFactory(powers.consume, wellKnown.issuer);
  const wallet = {
    alice: await walletFactory.makeSmartWallet(addr.alice),
    jack: await walletFactory.makeSmartWallet(addr.jack),
  };

  await E(wallet.alice.deposit).receive(await mintBrandedPayment(ONE_IST));
  await E(wallet.alice.deposit).receive(
    await mintBrandedPayment(fiveBeans.value),
  );
  const aliceSeat = seatLike(
    await startAlice(
      t,
      wellKnown,
      wallet.alice,
      fiveBeans,
      cowAmount,
      addr.jack,
    ),
  );

  const aliceResult = await E(aliceSeat).getOfferResult();
  t.is(aliceResult, 'invitation sent');

  await E(wallet.jack.deposit).receive(await mintBrandedPayment(ONE_IST));
  await E(wallet.jack.deposit).receive(
    await E(E.get(bldIssuerKit).mint).mintPayment(cowAmount),
  );
  const jackSeat = seatLike(
    await startJack(t, wellKnown, wallet.jack, fiveBeans, cowAmount),
  );

  const jackPayouts = await jackSeat.getPayoutAmounts();
  t.log('jack got', jackPayouts);
  const actualBeansAmount = jackPayouts.MagicBeans;
  t.deepEqual(actualBeansAmount, fiveBeans);

  const alicePayouts = await aliceSeat.getPayoutAmounts();
  t.log('alice got', alicePayouts);
  const actualCowAmount = alicePayouts.Cow;
  t.deepEqual(actualCowAmount, cowAmount);
});
