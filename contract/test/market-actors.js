// @ts-check
import { E, getInterfaceOf } from '@endo/far';
import { AmountMath, AssetKind } from '@agoric/ertp/src/amountMath.js';
import { allValues, mapValues } from '../src/objectTools.js';
import { seatLike } from './wallet-tools.js';
import { makeAgoricNames, makeNameProxy } from './ui-kit-goals/queryKit.js';

const { entries, fromEntries, keys } = Object;

/**
 * @typedef {{
 *   brand: Record<string, Promise<Brand>> & { timer: unknown }
 *   issuer: Record<string, Promise<Issuer>>
 *   instance: Record<string, Promise<Instance>>
 *   installation: Record<string, Promise<Installation>>
 * }} WellKnown
 */

/**
 * @typedef {{
 *   assetKind: Map<Brand, AssetKind>
 * }} WellKnownKinds
 */

/**
 * @param {import('ava').ExecutionContext} t
 * @param {{
 *   wallet: import('./wallet-tools.js').MockWallet;
 *   queryTool: Pick<import('./ui-kit-goals/queryKit.js').QueryTool, 'queryData'>;
 * }} mine
 * @param {{
 *   rxAddr: string,
 *   toSend: AmountKeywordRecord;
 * }} shared
 */
export const payerPete = async (
  t,
  { wallet, queryTool },
  { rxAddr, toSend },
) => {
  const hub = await makeAgoricNames(queryTool);
  /** @type {WellKnown} */
  const agoricNames = makeNameProxy(hub);

  const instance = await agoricNames.instance.postalSvc;

  t.log('Pete offers to send to', rxAddr, 'via contract', instance);
  const updates = await E(wallet.offers).executeOffer({
    id: 'peteSend1',
    invitationSpec: {
      source: 'contract',
      instance,
      publicInvitationMaker: 'makeSendInvitation',
      invitationArgs: [rxAddr],
    },
    proposal: { give: toSend },
  });

  const seat = seatLike(updates);
  const payouts = await E(seat).getPayoutAmounts();
  for (const [kwd, amt] of entries(payouts)) {
    const { brand } = amt;
    const kind = AssetKind.NAT; // TODO: handle non-fungible amounts
    t.log('Pete payout should be empty', kwd, amt);
    t.deepEqual(amt, AmountMath.makeEmpty(brand, kind));
  }
};

/**
 * @param {import('ava').ExecutionContext} t
 * @param {{ wallet: import('./wallet-tools.js').MockWallet, }} mine
 * @param {{ toSend: AmountKeywordRecord }} shared
 */
export const receiverRose = async (t, { wallet }, { toSend }) => {
  console.time('rose');
  console.timeLog('rose', 'before notifiers');
  const purseNotifier = mapValues(toSend, amt =>
    wallet.peek.purseUpdates(amt.brand),
  );
  console.timeLog('rose', 'after notifiers; before initial');

  const initial = await allValues(
    mapValues(purseNotifier, pn => pn.next().then(u => u.value)),
  );
  console.timeLog('rose', 'got initial', initial);
  t.log('Rose initial', initial);
  t.deepEqual(keys(initial), keys(toSend));

  const done = await allValues(
    fromEntries(
      entries(initial).map(([name, _update]) => {
        const amtP = purseNotifier[name].next().then(u => {
          const expected = AmountMath.add(initial[name], toSend[name]);
          t.log('Rose updated balance', name, u.value);
          t.deepEqual(u.value, expected);
          return u.value;
        });
        return [name, amtP];
      }),
    ),
  );
  t.log('Rose got balance updates', keys(done));
  t.deepEqual(keys(done), keys(toSend));
};

/**
 * @param {import('ava').ExecutionContext} t
 * @param {{ wallet: import('./wallet-tools.js').MockWallet, }} mine
 * @param {{ toSend: AmountKeywordRecord }} shared
 */
export const receiverRex = async (t, { wallet }, { toSend }) => {
  const purseUpdates = await allValues(
    mapValues(toSend, amt => E(wallet.peek).purseUpdates(amt.brand)),
  );

  const initial = await allValues(mapValues(purseUpdates, pn => E(pn).next()));

  const done = await allValues(
    fromEntries(
      keys(initial).map(name => {
        const amtP = E(purseUpdates[name])
          .next()
          .then(u => {
            t.log('Rex rxd', u.value);
            t.deepEqual(u.value, toSend[name]);
            return u.value;
          });
        return [name, amtP];
      }),
    ),
  );
  t.log('Rex got balance updates', keys(done));
  t.deepEqual(keys(done), keys(toSend));
};

export const senderContract = async (
  t,
  { zoe, terms: { postalSvc: instance, destAddr: addr1 } },
) => {
  const iIssuer = await E(zoe).getInvitationIssuer();
  const iBrand = await E(iIssuer).getBrand();
  const postalSvc = E(zoe).getPublicFacet(instance);
  const purse = await E(iIssuer).makeEmptyPurse();

  const noInvitations = AmountMath.make(iBrand, harden([]));
  const pmt1 = await E(purse).withdraw(noInvitations);

  t.log(
    'senderContract: E(',
    getInterfaceOf(await postalSvc),
    ').sendTo(',
    addr1,
    ',',
    noInvitations,
    ')',
  );
  const sent = await E(postalSvc).sendTo(addr1, pmt1);
  t.deepEqual(sent, noInvitations);
};
