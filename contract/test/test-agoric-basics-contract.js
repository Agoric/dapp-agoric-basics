/**
 * @file Tests for agoric-basics-contract.js
 */

// @ts-check

// eslint-disable-next-line import/no-unresolved -- https://github.com/avajs/ava/issues/2951
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import bundleSource from '@endo/bundle-source';
import { makeZoeKitForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, passStyleOf } from '@endo/far';
import { createRequire } from 'module';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';

test('exercise 1: bundleSource bundles the contract for use with zoe', async t => {
  const myRequire = createRequire(import.meta.url);
  const contractPath = myRequire.resolve(`../src/agoric-basics-contract.js`);

  // bundleSource() bundles contract and all of its modules into a single artifact
  // and is the first thing you need to do in order to deploy a contract
  // For more, see reference: https://docs.agoric.com/guides/zoe/#bundling-a-contract

  // TODO: initialize the const `bundle` using bundleSource() to pass the test below
  // Tips 1: you can import bundleSource() from @endo/bundle-source
  // Tips 2: don't forget to use `await` to get the fulfilled value
  const bundle = await bundleSource(contractPath);

  t.is(bundle.moduleFormat, 'endoZipBase64');
  t.true(bundle.endoZipBase64.length > 10_000);
});

test('exercise 2: start zoe instance', async t => {
  const myRequire = createRequire(import.meta.url);
  const contractPath = myRequire.resolve(`../src/agoric-basics-contract.js`);
  const bundle = await bundleSource(contractPath);
  const { zoeService: zoe } = makeZoeKitForTest();
  const installation = await E(zoe).install(bundle);
  t.is(passStyleOf(installation), 'remotable');

  const playMoney = makeIssuerKit('PlayMoney');
  const playMoneyIssuer = { Price: playMoney.issuer };
  const joinPrice = AmountMath.make(playMoney.brand, 5n);

  // startInstance creates an instance of the installed smart contract, with terms speicific to the instance
  // similar to how a JavaScript object is an instance of its class
  const { instance } = await E(zoe).startInstance(
    installation,
    playMoneyIssuer,
    {
      // TODO: initialize the instance with the expected joinPrice to pass the test below
      joinPrice,
    },
  );
  const terms = await E(zoe).getTerms(instance);

  t.is(terms.joinPrice, joinPrice);
});

test('exercise 3: atomicRearrange', async t => {
  const myRequire = createRequire(import.meta.url);
  const contractPath = myRequire.resolve(`../src/agoric-basics-contract.js`);
  const bundle = await bundleSource(contractPath);
  const { zoeService: zoe } = makeZoeKitForTest();
  const installation = await E(zoe).install(bundle);

  const playMoney = makeIssuerKit('PlayMoney');
  const playMoneyIssuer = { Price: playMoney.issuer };

  const { instance } = await E(zoe).startInstance(
    installation,
    playMoneyIssuer,
    {
      joinPrice: AmountMath.make(playMoney.brand, 5n),
    },
  );
  const publicFacet = await E(zoe).getPublicFacet(instance);
  const terms = await E(zoe).getTerms(instance);
  const alicePurse = playMoney.issuer.makeEmptyPurse();
  const amountOfMoney = AmountMath.make(playMoney.brand, 5n);
  const moneyPayment = playMoney.mint.mintPayment(amountOfMoney);
  alicePurse.deposit(moneyPayment);

  const { issuers, brands, joinPrice } = terms;
  const proposal = {
    give: { Price: joinPrice },
    want: { Tickets: AmountMath.make(brands.Ticket, 1n) },
  };

  const Price = await E(alicePurse).withdraw(joinPrice);

  const toJoin = E(publicFacet).makeJoinInvitation();

  const seat = E(zoe).offer(toJoin, proposal, { Price });
  const tickets = await E(seat).getPayout('Tickets');
  const actual = await E(issuers.Ticket).getAmountOf(tickets);
  // How do we complete the trade, i.e deduct the amount from alice's purse and mint her a ticket?
  // Hint: use atomicRearrange()
  // TODO: update atomicRearrange in agoric-basics-contract.js
  t.deepEqual(actual, proposal.want.Tickets);
});
