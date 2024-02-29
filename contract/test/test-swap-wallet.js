// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { createRequire } from 'node:module';
import { E, Far } from '@endo/far';
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { makePromiseSpace, makeNameHubKit } from '@agoric/vats';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKitForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';

// eslint-disable-next-line import/no-extraneous-dependencies
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';

import {
  installContract,
  startContract,
} from '../src/start-contract-proposal.js';
import { makeStableFaucet } from './mintStable.js';
import { seatLike } from './wallet-tools.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const myRequire = createRequire(import.meta.url);

const assets = {
  swaparoo: myRequire.resolve('../src/swaparoo.js'),
};
const contractName = 'swaparoo';

const makeTestContext = async _t => {
  const bundleCache = await makeNodeBundleCache('bundles/', {}, s => import(s));

  return { bundleCache, shared: {} };
};

test.before(async t => (t.context = await makeTestContext(t)));

/**
 * Mock enough powers for startSwaparoo permit.
 * Plus access to load bundles, peek at vstorage, and mint IST and BLD.
 *
 * @param {(...args: unknown[]) => void} log
 */
const mockBootstrap = async log => {
  const { produce, consume } = makePromiseSpace();
  const { admin, vatAdminState } = makeFakeVatAdmin();
  const { zoeService: zoe, feeMintAccess } = makeZoeKitForTest(admin);
  const feeIssuer = await E(zoe).getFeeIssuer();
  const feeBrand = await E(feeIssuer).getBrand();

  const { rootNode: chainStorage } = makeFakeStorageKit('published');

  const { nameAdmin: agoricNamesAdmin } = makeNameHubKit();
  const spaces = await makeWellKnownSpaces(agoricNamesAdmin, log, [
    'installation',
    'instance',
    'issuer',
    'brand',
  ]);

  const { nameAdmin: namesByAddressAdmin } = makeNameHubKit();

  const startUpgradable = ({
    installation,
    issuerKeywordRecord,
    terms,
    privateArgs,
    label,
  }) =>
    E(zoe).startInstance(
      installation,
      issuerKeywordRecord,
      terms,
      privateArgs,
      label,
    );

  const bldIssuerKit = makeIssuerKit('BLD', 'nat', { decimalPlaces: 6 });
  produce.bldIssuerKit.resolve(bldIssuerKit);
  produce.zoe.resolve(zoe);
  produce.startUpgradable.resolve(startUpgradable);
  produce.feeMintAccess.resolve(feeMintAccess);
  produce.chainStorage.resolve(chainStorage);
  produce.namesByAddressAdmin.resolve(namesByAddressAdmin);
  spaces.issuer.produce.IST.resolve(feeIssuer);
  spaces.brand.produce.IST.resolve(feeBrand);
  spaces.issuer.produce.BLD.resolve(bldIssuerKit.issuer);
  spaces.brand.produce.BLD.resolve(bldIssuerKit.brand);

  /** @type {BootstrapPowers} */
  // @ts-expect-error mock / cast
  const powers = { produce, consume, ...spaces };

  return { powers, vatAdminState };
};

test.serial('bootstrap and start contract', async t => {
  t.log('bootstrap');
  const { powers, vatAdminState } = await mockBootstrap(console.log);

  const { bundleCache } = t.context;
  const bundle = await bundleCache.load(assets.swaparoo, contractName);
  const bundleID = `b1-${bundle.endoZipBase64Sha512}`;
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
 * @param {*} wellKnown
 * @param {MockWallet} wallet
 * @param {Amount} beansAmount
 * @param {Amount} cowsAmount
 * @param {string} depositAddress
 * @param {boolean} [alicePays]
 */
const startAlice = async (
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

  const updates = E(wallet.offers).executeOffer(offerSpec);
  return updates;
};

/**
 * @param {*} wellKnown
 * @param {MockWallet} wallet
 * @param {Amount} beansAmount
 * @param {Amount} cowsAmount
 * @param {boolean} [jackPays]
 */
const startJack = async (
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

  return E(wallet.offers).executeOffer(offerSpec);
};

const { entries, fromEntries } = Object;

/** @type { <T extends Record<string, ERef<any>>>(obj: T) => Promise<{ [K in keyof T]: Awaited<T[K]>}> } */
const allValues = async obj => {
  const es = await Promise.all(
    entries(obj).map(async ([k, vP]) => Promise.resolve(vP).then(v => [k, v])),
  );
  return fromEntries(es);
};

/** @type { <V, U, T extends Record<string, V>>(obj: T, f: (v: V) => U) => Record<string, U>} */
const mapValues = (obj, f) =>
  fromEntries(entries(obj).map(([p, v]) => [p, f(v)]));

/**
 * @deprecated use wallet-tools instead
 *
 * @param {{
 *   zoe: ERef<ZoeService>;
 *   chainStorage: ERef<StorageNode>;
 *   namesByAddressAdmin: ERef<import('@agoric/vats').NameAdmin>;
 * }} powers
 *
 * @param {IssuerKeywordRecord} issuerKeywordRecord
 *
 * @typedef {import('@agoric/smart-wallet/src/offers.js').OfferSpec} OfferSpec
 * @typedef {import('@agoric/smart-wallet/src/smartWallet.js').UpdateRecord} UpdateRecord
 *
 * @typedef {Awaited<ReturnType<Awaited<ReturnType<typeof mockWalletFactory>['makeSmartWallet']>>>} MockWallet
 */
const mockWalletFactory = (
  { zoe, namesByAddressAdmin },
  issuerKeywordRecord,
) => {
  const DEPOSIT_FACET_KEY = 'depositFacet';

  const { Fail } = assert;

  //   const walletsNode = E(chainStorage).makeChildNode('wallet');

  // TODO: provideSmartWallet
  /** @param {string} address */
  const makeSmartWallet = async address => {
    const { nameAdmin: addressAdmin } = await E(
      namesByAddressAdmin,
    ).provideChild(address, [DEPOSIT_FACET_KEY]);

    const purseByBrand = new Map();
    await allValues(
      mapValues(issuerKeywordRecord, async issuer => {
        const purse = await E(issuer).makeEmptyPurse();
        const brand = await E(issuer).getBrand();
        purseByBrand.set(brand, purse);
      }),
    );
    const invitationBrand = await E(E(zoe).getInvitationIssuer()).getBrand();
    purseByBrand.has(invitationBrand) ||
      Fail`no invitation issuer / purse / brand`;
    const invitationPurse = purseByBrand.get(invitationBrand);

    const depositFacet = Far('DepositFacet', {
      /** @param {Payment} pmt */
      receive: async pmt => {
        const pBrand = await E(pmt).getAllegedBrand();
        if (!purseByBrand.has(pBrand))
          throw Error(`brand not known/supported: ${pBrand}`);
        const purse = purseByBrand.get(pBrand);
        return E(purse).deposit(pmt);
      },
    });
    await E(addressAdmin).default(DEPOSIT_FACET_KEY, depositFacet);

    // const updatesNode = E(walletsNode).makeChildNode(address);
    // const currentNode = E(updatesNode).makeChildNode('current');

    const getContractInvitation = invitationSpec => {
      const {
        instance,
        publicInvitationMaker,
        invitationArgs = [],
      } = invitationSpec;
      const pf = E(zoe).getPublicFacet(instance);
      return E(pf)[publicInvitationMaker](...invitationArgs);
    };

    const getPurseInvitation = async invitationSpec => {
      //   const { instance, description } = invitationSpec;
      const invitationAmount = await E(invitationPurse).getCurrentAmount();
      console.log(
        'TODO: check invitation amount against instance',
        invitationAmount,
        invitationSpec,
      );
      return E(invitationPurse).withdraw(invitationAmount);
    };

    const sourceImpl = {
      contract: getContractInvitation,
      purse: getPurseInvitation,
    };
    /**
     * @param {OfferSpec} offerSpec
     * @returns {AsyncGenerator<UpdateRecord>}
     */
    async function* executeOffer(offerSpec) {
      const { invitationSpec, proposal, offerArgs } = offerSpec;
      const { source } = invitationSpec;
      const impl = sourceImpl[source] || Fail`unsupported source: ${source}`;
      const invitation = await impl(invitationSpec);
      const pmts = await allValues(
        mapValues(proposal.give || {}, async amt => {
          const { brand } = amt;
          if (!purseByBrand.has(brand))
            throw Error(`brand not known/supported: ${brand}`);
          const purse = purseByBrand.get(brand);
          return E(purse).withdraw(amt);
        }),
      );
      const seat = await E(zoe).offer(invitation, proposal, pmts, offerArgs);
      //   console.log(address, offerSpec.id, 'got seat');
      yield { updated: 'offerStatus', status: offerSpec };
      const result = await E(seat).getOfferResult();
      //   console.log(address, offerSpec.id, 'got result', result);
      yield { updated: 'offerStatus', status: { ...offerSpec, result } };
      const [payouts, numWantsSatisfied] = await Promise.all([
        E(seat).getPayouts(),
        E(seat).numWantsSatisfied(),
      ]);
      yield {
        updated: 'offerStatus',
        status: { ...offerSpec, result, numWantsSatisfied },
      };
      const amts = await allValues(
        mapValues(payouts, pmtP =>
          Promise.resolve(pmtP).then(pmt => depositFacet.receive(pmt)),
        ),
      );
      //   console.log(address, offerSpec.id, 'got payouts', amts);
      yield {
        updated: 'offerStatus',
        status: { ...offerSpec, result, numWantsSatisfied, payouts: amts },
      };
    }

    return { deposit: depositFacet, offers: Far('Offers', { executeOffer }) };
  };

  return harden({ makeSmartWallet });
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
    await startAlice(wellKnown, wallet.alice, fiveBeans, cowAmount, addr.jack),
  );

  const aliceResult = await E(aliceSeat).getOfferResult();
  t.is(aliceResult, 'invitation sent');

  await E(wallet.jack.deposit).receive(await mintBrandedPayment(ONE_IST));
  await E(wallet.jack.deposit).receive(
    await E(E.get(bldIssuerKit).mint).mintPayment(cowAmount),
  );
  const jackSeat = seatLike(
    await startJack(wellKnown, wallet.jack, fiveBeans, cowAmount),
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
