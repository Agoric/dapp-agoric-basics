// @ts-check
// XXX what's the state-of-the-art in ava setup?
// eslint-disable-next-line import/order
import { test as anyTest } from './prepare-test-env-ava.js';

import { createRequire } from 'module';

import { E, passStyleOf } from '@endo/far';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import { startPostalSvc } from '../src/start-postalSvc.js';
import { bootAndInstallBundles, makeMockTools } from './boot-tools.js';
import { makeBundleCacheContext, getBundleId } from './bundle-tools.js';
import { mockWalletFactory } from './wallet-tools.js';
import {
  payerPete,
  receiverRex,
  receiverRose,
  senderContract,
} from './market-actors.js';
import {
  makeNameProxy,
  makeAgoricNames,
} from './ui-kit-goals/name-service-client.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const nodeRequire = createRequire(import.meta.url);

const bundleRoots = {
  postalSvc: nodeRequire.resolve('../src/postalSvc.js'),
};

const scriptRoots = {
  postalSvc: nodeRequire.resolve('../src/start-postalSvc.js'),
};

/** @param {import('ava').ExecutionContext} t */
const makeTestContext = async t => {
  const bc = await makeBundleCacheContext(t);

  console.time('makeTestTools');
  console.timeLog('makeTestTools', 'start');
  const tools = await makeMockTools(t, bc.bundleCache);
  console.timeEnd('makeTestTools');

  return { ...tools, ...bc };
};

test.before(async t => (t.context = await makeTestContext(t)));

test.serial('well-known brand (ATOM) is available', async t => {
  const { makeQueryTool } = t.context;
  const hub0 = makeAgoricNames(makeQueryTool());
  const agoricNames = makeNameProxy(hub0);
  await null;
  const brand = {
    ATOM: await agoricNames.brand.ATOM,
  };
  t.log(brand);
  t.is(passStyleOf(brand.ATOM), 'remotable');
});

test.serial('install bundle: postalSvc / send', async t => {
  const { installBundles } = t.context;
  console.time('installBundles');
  console.timeLog('installBundles', Object.keys(bundleRoots).length, 'todo');
  const bundles = await installBundles(bundleRoots, (...args) =>
    console.timeLog('installBundles', ...args),
  );
  console.timeEnd('installBundles');

  const id = getBundleId(bundles.postalSvc);
  const shortId = id.slice(0, 8);
  t.log('postalSvc', shortId);
  t.is(id.length, 3 + 128, 'bundleID length');
  t.regex(id, /^b1-.../);

  Object.assign(t.context.shared, { bundles });
});

test.serial('deploy contract with core eval: postalSvc / send', async t => {
  const { runCoreEval } = t.context;
  const { bundles } = t.context.shared;
  const bundleID = getBundleId(bundles.postalSvc);

  const name = 'send';
  const result = await runCoreEval({
    name,
    behavior: startPostalSvc,
    entryFile: scriptRoots.postalSvc,
    config: {
      options: { postalSvc: { bundleID, issuerNames: ['ATOM', 'Item'] } },
    },
  });

  t.log(result.voting_end_time, '#', result.proposal_id, name);
  t.like(result, {
    content: {
      '@type': '/agoric.swingset.CoreEvalProposal',
    },
    status: 'PROPOSAL_STATUS_PASSED',
  });
});

test.serial('agoricNames.instances has contract: postalSvc', async t => {
  const { makeQueryTool } = t.context;
  const hub0 = makeAgoricNames(makeQueryTool());
  const agoricNames = makeNameProxy(hub0);
  await null;
  const instance = await agoricNames.instance.postalSvc;
  t.log(instance);
  t.is(passStyleOf(instance), 'remotable');
});

test.serial('deliver payment using offer', async t => {
  const { provisionSmartWallet, makeQueryTool } = t.context;
  const qt = makeQueryTool();
  const hub0 = makeAgoricNames(qt);
  /** @type {import('./market-actors.js').WellKnown} */
  const agoricNames = makeNameProxy(hub0);

  await null;
  const { make: amt } = AmountMath;
  const shared = {
    rxAddr: 'agoric1aap7m84dt0rwhhfw49d4kv2gqetzl56vn8aaxj',
    toSend: {
      Pmt: amt(await agoricNames.brand.ATOM, 3n),
      // TODO non-fungible: Inventory: amt(Item.brand, harden(['map'])),
    },
  };

  const wallet = {
    pete: await provisionSmartWallet(
      'agoric1xe269y3fhye8nrlduf826wgn499y6wmnv32tw5',
      { ATOM: 10n, BLD: 75n },
    ),
    rose: await provisionSmartWallet(shared.rxAddr, {
      BLD: 20n,
      // TODO non-fungibles: Item: amt(Item.brand, harden(['potion', 'map'])),
    }),
  };
  const pqt = makeQueryTool();
  for (const kind of ['instance', 'brand']) {
    const entries = await E(E(hub0).lookup(kind)).entries();
    pqt.fromCapData(qt.toCapData(entries));
  }

  await Promise.all([
    payerPete(t, { wallet: wallet.pete, queryTool: pqt }, shared),
    receiverRose(t, { wallet: wallet.rose }, shared),
  ]);
});

test.todo('E2E: send using publicFacet using contract');

test('send invitation* from contract using publicFacet of postalSvc', async t => {
  const { powers, bundles } = await bootAndInstallBundles(t, bundleRoots);

  const bundleID = getBundleId(bundles.postalSvc);
  await startPostalSvc(powers, {
    options: { postalSvc: { bundleID, issuerNames: ['IST', 'Invitation'] } },
  });

  const { zoe, namesByAddressAdmin } = powers.consume;
  const smartWalletIssuers = {
    Invitation: await E(zoe).getInvitationIssuer(),
    IST: await E(zoe).getFeeIssuer(),
  };

  // TODO: use CapData across vats
  // const boardMarshaller = await E(board).getPublishingMarshaller();
  const walletFactory = mockWalletFactory(
    { zoe, namesByAddressAdmin },
    smartWalletIssuers,
  );
  /** @type {import('../src/start-postalSvc.js').PostalSvcPowers} */
  // @ts-expect-error cast
  const postalSpace = powers;
  const instance = await postalSpace.instance.consume.postalSvc;

  const shared = {
    rxAddr: 'agoric1receiverRex',
    toSend: {
      ToDoNothing: AmountMath.make(
        await powers.brand.consume.Invitation,
        harden([]),
      ),
    },
  };

  const wallet = await walletFactory.makeSmartWallet(shared.rxAddr);
  const terms = { postalSvc: instance, destAddr: shared.rxAddr };
  await Promise.all([
    senderContract(t, { zoe, terms }),
    receiverRex(t, { wallet }, shared),
  ]);
});

test.todo('partial failure: send N+1 payments where >= 1 delivery fails');
