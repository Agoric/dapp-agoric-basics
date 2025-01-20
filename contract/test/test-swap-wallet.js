// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { createRequire } from 'node:module';
import { E } from '@endo/far';
import { AmountMath } from '@agoric/ertp';
import { extractPowers } from '@agoric/vats/src/core/utils.js';

import { mockBootstrapPowers } from './boot-tools.js';
import {
  installSwapContract,
  permit,
  startSwapContract,
  startSwaparooCharter,
} from '../src/swaparoo.proposal.js';
import { makeStableFaucet } from './mintStable.js';
import { mockWalletFactory, seatLike } from './wallet-tools.js';
import { getBundleId, makeBundleCacheContext } from '../tools/bundle-tools.js';
import {
  installPuppetGovernance,
  mockElectorate,
  assets as govAssets,
} from './lib-gov-test/puppet-gov.js';

/**
 * @import {Amount} from '@agoric/ertp/src/types.js';
 * @import {MockWallet} from './wallet-tools.js';
 * @import {ExecutionContext, TestFn} from 'ava';
 * @import {OfferSpec} from '@agoric/smart-wallet/src/offers.js';
 */

/** @typedef {MockWallet} MockWallet */

/**
 * @typedef {{
 *   getExitMessage: () => any;
 *   getHasExited: () => boolean;
 *   getExitWithFailure: () => any;
 *   installBundle: (id: any, bundle: any) => any;
 *   installNamedBundle: (name: any, id: any, bundle: any) => any;
 *   getCriticalVatKey: () => {};
 *   getVatPowers: () => { D: (bcap: any) => { getBundle: () => any } };
 * }} FakeVatAdminState
 */

/**
 * @typedef {Awaited<ReturnType<makeTestContext>>} TestContext
 */
const test = /** @type {TestFn<TestContext>}} */ (anyTest);

const nodeRequire = createRequire(import.meta.url);

const contractName = 'swaparoo';
const assets = {
  [contractName]: nodeRequire.resolve(`../src/${contractName}.contract.js`),
};

const makeTestContext = async t => {
  const bc = await makeBundleCacheContext(t);
  t.log('bootstrap');
  const { powers, vatAdminState } = await mockBootstrapPowers(t.log);

  const { zoe } = powers.consume;
  for await (const [name, asset] of Object.entries({
    econCommitteeCharter: govAssets.committeeCharter,
  })) {
    powers.installation.produce[name].resolve(
      E(zoe).install(await bc.bundleCache.load(asset)),
    );
  }

  return { ...bc, powers, vatAdminState };
};

test.before(async t => (t.context = await makeTestContext(t)));

test.serial('install bundle; make zoe Installation', async t => {
  const { bundleCache, powers, vatAdminState } = t.context;

  const bundle = await bundleCache.load(assets.swaparoo, contractName);
  const bundleID = getBundleId(bundle);
  t.log('publish bundle', bundleID.slice(0, 8));
  vatAdminState.installBundle(bundleID, bundle);
  t.log('install contract');
  const config = { options: { [contractName]: { bundleID } } };
  const installation = await installSwapContract(powers, config);
  t.log(installation);
  t.is(typeof installation, 'object');
});

test.serial('install puppet governor; mock getPoserInvitation', async t => {
  const { bundleCache, powers } = t.context;
  const { zoe } = powers.consume;
  await installPuppetGovernance(zoe, powers.installation.produce, bundleCache);

  powers.produce[`${contractName}CommitteeKit`].resolve(
    mockElectorate(zoe, bundleCache),
  );

  const invitation = await E(
    E.get(powers.consume[`${contractName}CommitteeKit`]).creatorFacet,
  ).getPoserInvitation();
  t.log(invitation);
  t.is(typeof invitation, 'object');
});

test.serial('start contract', async t => {
  t.log('install, start contract');
  const { powers } = t.context;
  t.log('start contract, checking permit');
  const permittedPowers = extractPowers(permit, powers);

  const config = {
    options: {
      [`${contractName}Committee`]: {
        voterAddresses: {},
      },
    },
  };

  await Promise.all([
    startSwaparooCharter(permittedPowers, config),
    startSwapContract(permittedPowers),
  ]);

  const instance = await powers.instance.consume[contractName];
  t.log(instance);
  t.is(typeof instance, 'object');
});

/**
 * @param {ExecutionContext} t
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

  // Governed terms are in vstorage
  const feeAmount = await wellKnown.getGovernedParam(instance, 'Fee');

  const proposal = {
    give: { MagicBeans: beansAmount, Fee: feeAmount },
    want: {
      Cow: cowsAmount,
      ...(alicePays ? {} : { Refund: feeAmount }),
    },
  };

  /** @type {OfferSpec} */
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
 * @param {ExecutionContext} t
 * @param {*} wellKnown
 * @param {MockWallet} wallet
 * @param {Amount} beansAmount
 * @param {Amount} cowsAmount
 * @param {string} offerDescription
 * @param {boolean} [jackPays]
 */
const startJack = async (
  t,
  wellKnown,
  wallet,
  beansAmount,
  cowsAmount,
  offerDescription,
  jackPays = false,
) => {
  const instance = wellKnown.instance[contractName];
  const feeAmount = await wellKnown.getGovernedParam(instance, 'Fee');

  const proposal = {
    want: { MagicBeans: beansAmount },
    give: {
      Cow: cowsAmount,
      ...(jackPays ? { Refund: feeAmount } : {}),
    },
  };

  /** @type {OfferSpec} */
  const offerSpec = {
    id: 'jack-123',
    invitationSpec: {
      source: 'purse',
      instance,
      description: offerDescription,
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

  const { powers, bundleCache } = t.context;

  const { zoe, feeMintAccess, bldIssuerKit } = powers.consume;
  const instance = await powers.instance.consume[contractName];

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
    getGovernedParam: async (i, n) => {
      const pf = await E(zoe).getPublicFacet(i);
      const params = await E(pf).getGovernedParams();
      return params[n].value;
    },
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
    await mintBrandedPayment(/** @type {bigint} */ (fiveBeans.value)),
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
    await startJack(
      t,
      wellKnown,
      wallet.jack,
      fiveBeans,
      cowAmount,
      'matchOffer-0',
    ),
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
