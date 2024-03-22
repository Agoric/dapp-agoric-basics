// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { createRequire } from 'node:module';
import { E } from '@endo/far';

import { extractPowers } from '@agoric/vats/src/core/utils.js';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import { mockBootstrapPowers } from './boot-tools.js';
import {
  installSwapContract,
  permit,
  startSwapContract,
  startSwaparooCharter,
} from '../src/swaparoo.proposal.js';
import { makeBundleCacheContext } from '../tools/bundle-tools.js';
import {
  installPuppetGovernance,
  mockElectorate,
  assets as govAssets,
} from './lib-gov-test/puppet-gov.js';
import { NonNullish } from '../src/objectTools.js';

/** @typedef {import('./wallet-tools.js').MockWallet} MockWallet */

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const nodeRequire = createRequire(import.meta.url);

const contractName = 'swaparoo';
export const assets = {
  [contractName]: nodeRequire.resolve(`../src/${contractName}.contract.js`),
};

const makeTestContext = async t => {
  const bc = await makeBundleCacheContext(t);
  t.log('bootstrap');
  const { powers, vatAdminState } = await mockBootstrapPowers(t.log);

  const { zoe } = powers.consume;
  for await (const [name, asset] of Object.entries({
    binaryVoteCounter: govAssets.binaryVoteCounter,
    econCommitteeCharter: govAssets.committeeCharter,
  })) {
    t.log('installation:', name);
    powers.installation.produce[name].resolve(
      E(zoe).install(await bc.bundleCache.load(asset)),
    );
  }

  return { ...bc, powers, vatAdminState };
};

test.before(async t => (t.context = await makeTestContext(t)));

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

test.serial('install bundle; make zoe Installation', async t => {
  const { bundleCache, powers, vatAdminState } = t.context;

  const bundle = await bundleCache.load(assets.swaparoo, contractName);
  const bundleID = `b1-${bundle.endoZipBase64Sha512}`;
  t.log('publish bundle', bundleID.slice(0, 8));
  vatAdminState.installBundle(bundleID, bundle);
  t.log('install contract');
  const config = { options: { [contractName]: { bundleID } } };
  const installation = await installSwapContract(powers, config);
  t.log(installation);
  t.is(typeof installation, 'object');
});

test.serial('start governed swap contract', async t => {
  const { powers } = t.context;

  t.log('start contract, checking permit');
  const permittedPowers = extractPowers(permit, powers);
  const config = {
    options: { [`${contractName}Committee`]: { voterAddresses: {} } },
  };
  await startSwaparooCharter(powers, config);
  await startSwapContract(permittedPowers);

  const instance = await powers.instance.consume[contractName];
  t.log(instance);
  t.is(typeof instance, 'object');

  const puppetGovernors = {
    [contractName]: E.get(powers.consume[`${contractName}Kit`])
      .governorCreatorFacet,
  };

  Object.assign(t.context.shared, { powers, puppetGovernors });
});

test.serial('vote to change swap fee', async t => {
  const { powers, shared } = t.context;
  const { puppetGovernors } = shared;
  const { zoe } = powers.consume;

  const istBrand = await powers.brand.consume.IST;
  const { decimalPlaces } = await E(istBrand).getDisplayInfo();

  const instance = await powers.instance.consume[contractName];
  const swapPub = E(zoe).getPublicFacet(instance);

  const before = await E(swapPub).getAmount('Fee');
  t.deepEqual(before, AmountMath.make(istBrand, 1n));

  const UNIT = 10n ** BigInt(NonNullish(decimalPlaces));
  const CENT = UNIT / 100n;
  const targetFee = AmountMath.make(istBrand, 50n * CENT);
  const changes = { Fee: targetFee };
  t.log('changeParams', changes);
  const swapGov = NonNullish(puppetGovernors[contractName]);
  await E(swapGov).changeParams(harden({ changes }));
  const after = await E(swapPub).getAmount('Fee');
  t.deepEqual(after, targetFee);
});

test.todo('wallet-based voting');
test.todo('swap after changing fee');
test.todo('e2e swap after changing fee with voters');
