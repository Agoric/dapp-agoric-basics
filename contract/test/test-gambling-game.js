import test from 'ava';
import { E } from '@endo/far';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { makeZoeKit } from '@agoric/zoe';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin';
import { start } from '../src/gambling-game.contract.js';

test('Gambling game contract', async t => {
  const { zoeService } = makeZoeKit(makeFakeVatAdmin().admin);
  const { issuer, mint, brand } = makeIssuerKit('IST');

  const installation = await E(zoeService).install(start);
  const { publicFacet } = await E(zoeService).startInstance(installation, { IST: issuer });

  const aliceAmount = AmountMath.make(brand, 100n);
  const alicePayment = mint.mintPayment(aliceAmount);

  const aliceInvitation = E(publicFacet).makeDepositInvitation();
  const proposal = { give: { IST: aliceAmount } };
  const payments = { IST: alicePayment };

  await E(zoeService).offer(aliceInvitation, proposal, payments);
  t.is(await E(publicFacet).getEntriesCount(), 1);
});

