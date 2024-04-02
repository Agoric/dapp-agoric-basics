// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { createRequire } from 'node:module';
import { E } from '@endo/far';

import { extractPowers } from '@agoric/vats/src/core/utils.js';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';

import { main, permit } from '../src/swaparoo.proposal.js';

import { mockBootstrapPowers } from './boot-tools.js';
import { makeBundleCacheContext } from '../tools/bundle-tools.js';
import { NonNullish } from '../src/objectTools.js';
import { mockWalletFactory, seatLike } from './wallet-tools.js';
import { INVITATION_MAKERS_DESC } from '../src/platform-goals/start-governed-contract.js';
import { installGovContracts } from './lib-gov-test/puppet-gov.js';

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

  await installGovContracts(t, powers, bc.bundleCache);

  return { ...bc, powers, vatAdminState };
};

test.before(async t => (t.context = await makeTestContext(t)));

/**
 * @param {import('ava').ExecutionContext} t
 * @param {MockWallet} wallet
 * @param {{ instance: BootstrapPowers['instance']['consume']}} wellKnown
 */
const makeVoter = (t, wallet, wellKnown) => {
  let charterAcceptOfferId;
  let committeeOfferId;

  const doOffer = async offer => {
    t.snapshot(offer, `voter offer: ${offer.id}`);
    const updates = wallet.offers.executeOffer(offer);
    const seat = seatLike(updates);
    const result = await seat.getOfferResult();
    await seatLike(updates).getPayoutAmounts();
    return result;
  };

  const acceptInvitation = async (offerId, { instance, description }) => {
    /** @type {import('./wallet-tools.js').OfferSpec} */
    const offer = {
      id: offerId,
      invitationSpec: {
        source: 'purse',
        description,
        instance,
      },
      proposal: {},
    };
    const result = await doOffer(offer);
    charterAcceptOfferId = offerId;
    return result;
  };

  const acceptCharterInvitation = async offerId => {
    const instance = await wellKnown.instance[`${contractName}Charter`];
    const description = INVITATION_MAKERS_DESC;
    const result = await acceptInvitation(offerId, { instance, description });
    charterAcceptOfferId = offerId;
    return result;
  };

  const acceptCommitteeInvitation = async (offerId, index) => {
    const instance = await wellKnown.instance[`${contractName}Committee`];
    const description = `Voter${index}`;
    const result = await acceptInvitation(offerId, { instance, description });
    committeeOfferId = offerId;
    return result;
  };

  const putQuestion = async (offerId, params, deadline) => {
    const instance = await wellKnown.instance[contractName];
    const path = { paramPath: { key: 'governedParams' } };

    /** @type {import('@agoric/inter-protocol/src/econCommitteeCharter.js').ParamChangesOfferArgs} */
    const offerArgs = harden({ deadline, params, instance, path });

    /** @type {import('@agoric/smart-wallet/src/offers.js').OfferSpec} */
    const offer = {
      id: offerId,
      invitationSpec: {
        source: 'continuing',
        previousOffer: NonNullish(charterAcceptOfferId),
        invitationMakerName: 'VoteOnParamChange',
      },
      offerArgs,
      proposal: {},
    };
    return doOffer(offer);
  };

  /**
   * @param {string | number} offerId
   * @param {QuestionDetails} details - TODO: get from vstorage
   * @param {number} position
   */
  const vote = async (offerId, details, position) => {
    const chosenPositions = [details.positions[position]];

    /** @type {import('./wallet-tools.js').OfferSpec} */
    const offer = {
      id: offerId,
      invitationSpec: {
        source: 'continuing',
        previousOffer: NonNullish(committeeOfferId),
        invitationMakerName: 'makeVoteInvitation',
        invitationArgs: harden([chosenPositions, details.questionHandle]),
      },
      proposal: {},
    };
    return doOffer(offer);
  };

  return harden({
    acceptCharterInvitation,
    acceptCommitteeInvitation,
    putQuestion,
    vote,
  });
};

const voterAddresses = {
  mem1: 'agoric18jr9nlvp300feu726y3v4n07ykfjwup3twnlyn',
};

test.serial('provision Voter1 account', async t => {
  const { powers } = t.context;
  const { zoe, namesByAddressAdmin } = powers.consume;

  await null;
  const walletFactory = mockWalletFactory(
    { zoe, namesByAddressAdmin },
    { Invitation: await powers.issuer.consume.Invitation },
  );

  const victor = makeVoter(
    t,
    await walletFactory.makeSmartWallet(voterAddresses.mem1),
    { instance: powers.instance.consume },
  );
  t.pass();

  Object.assign(t.context.shared, { victor });
});

test.serial('install bundle', async t => {
  const { bundleCache, vatAdminState } = t.context;
  const bundle = await bundleCache.load(assets.swaparoo, contractName);
  const bundleID = `b1-${bundle.endoZipBase64Sha512}`;
  t.log('publish bundle', bundleID.slice(0, 8));
  vatAdminState.installBundle(bundleID, bundle);
  Object.assign(t.context.shared, { bundleID });
  t.pass();
});

test.serial('core eval: start swap committee, charter, contract', async t => {
  const { powers, shared } = t.context;

  const permittedPowers = extractPowers(permit, powers);
  const { bundleID } = shared;
  const config = {
    options: {
      [contractName]: { bundleID },
      [`${contractName}Committee`]: {
        voterAddresses,
      },
    },
  };

  t.log('run core eval', config);

  const { installation, committeeFacets } = await main(permittedPowers, config);

  const kit = await powers.consume[`${contractName}Kit`];
  t.log(`${contractName}Kit`, 'facets', Object.keys(kit));
  t.is(typeof kit.governorCreatorFacet, 'object');
  t.is(typeof committeeFacets.instance, 'object');
  t.is(typeof installation, 'object');
  t.is(typeof (await powers.instance.consume[contractName]), 'object');
  t.is(
    typeof (await powers.instance.consume[`${contractName}Committee`]),
    'object',
  );
  t.is(
    typeof (await powers.instance.consume[`${contractName}Charter`]),
    'object',
  );
});

test.serial('Voter0 accepts charter, committee invitations', async t => {
  /** @type {ReturnType<typeof makeVoter>} */
  const victor = t.context.shared.victor;
  await victor.acceptCommitteeInvitation('v0-join-committee', 0);
  await victor.acceptCharterInvitation('v0-accept-charter');
  t.pass();
});

/** @param {Promise<Brand>} brandP */
const makeAmountMaker = async brandP => {
  const brand = await brandP;
  const { decimalPlaces } = await E(brand).getDisplayInfo();
  const unit = BigInt(10 ** NonNullish(decimalPlaces));
  /**
   * @param {bigint} num
   * @param {bigint} [denom]
   */
  return (num, denom = 1n) => AmountMath.make(brand, (num * unit) / denom);
};

test.serial('vote to change swap fee', async t => {
  const { powers } = t.context;
  const IST = await makeAmountMaker(powers.brand.consume.IST);
  const targetFee = IST(50n, 100n);
  const changes = { Fee: targetFee };

  const { zoe } = powers.consume;

  /** @type {ReturnType<typeof makeVoter>} */
  const victor = t.context.shared.victor;

  /** @type {BootstrapPowers & import('../src/swaparoo.proposal.js').SwaparooSpace */
  // @ts-expect-error cast
  const swapPowers = powers;
  const swapPub = E(zoe).getPublicFacet(
    swapPowers.instance.consume[contractName],
  );
  const cmtePub = E(zoe).getPublicFacet(
    swapPowers.instance.consume[`${contractName}Committee`],
  );

  const before = await E(swapPub).getAmount('Fee');
  t.deepEqual(before, IST(1n, 1_000_000n));

  const deadline = BigInt(new Date(2024, 6, 1, 9, 10).valueOf() / 1000);
  const result = await victor.putQuestion('proposeToSetFee', changes, deadline);
  t.log('question is posed', result);

  // TODO: .latestQuestion from vstorage
  const qSub = await E(cmtePub).getQuestionSubscriber();
  const { value: details } = await E(qSub).getUpdateSince();
  t.is(details.electionType, 'param_change');
  const voteResult = await victor.vote('voteToSetFee', details, 0);
  t.log('victor voted:', voteResult);

  const timer = details.closingRule.timer;
  await E(timer).tickN(11);

  // TODO: .latestOutcome from vstorage
  const counterHandle = await E(
    E(cmtePub).getQuestion(details.questionHandle),
  ).getVoteCounter();
  const counterPub = await E(zoe).getPublicFacet(counterHandle);
  const outcome = await E(counterPub).getOutcome();
  t.deepEqual(outcome, { changes });
  t.log('question carried');

  const after = await E(swapPub).getAmount('Fee');
  t.deepEqual(after, targetFee);
});

test.todo('wallet-based voting');
test.todo('swap after changing fee');
test.todo('e2e swap after changing fee with voters');
