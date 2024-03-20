/** @file snapshot test for vstorage contents relevant to dapp devs */
// @ts-check
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { createRequire } from 'node:module';
import fsp from 'node:fs/promises';
import { execFile, execFileSync } from 'node:child_process';
/* global fetch, setTimeout */

import { makeBundleCacheContext } from '../tools/bundle-tools.js';
import { makeE2ETools } from '../tools/e2e-tools.js';
import { allValues, mapValues } from '../src/objectTools.js';

const { entries, fromEntries, keys } = Object;

/** @typedef {import('./wallet-tools.js').MockWallet} MockWallet */

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const nodeRequire = createRequire(import.meta.url);

const contractName = 'swaparoo';
export const assets = {
  [contractName]: nodeRequire.resolve(`../src/${contractName}.contract.js`),
};

const config = {
  workdir: '/workspace/contract',
  service: 'agd',
  bundleDir: 'bundles',
};

const makeTestContext = async t => {
  const { writeFile } = fsp;
  const { bundleCache } = await makeBundleCacheContext(t);

  const { workdir, service } = config;
  /** @type {import('../tools/agd-lib.js').ExecSync} */
  const dockerExec = (file, dargs, opts = { encoding: 'utf-8' }) => {
    const execArgs = ['compose', 'exec', '--workdir', workdir, service];
    opts.verbose &&
      console.log('docker compose exec', JSON.stringify([file, ...dargs]));
    return execFileSync('docker', [...execArgs, file, ...dargs], opts);
  };

  const tools = makeE2ETools(t, bundleCache, {
    execFile,
    execFileSync: service === '.' ? execFileSync : dockerExec,
    fetch,
    setTimeout,
    writeFile,
    bundleDir: config.bundleDir,
  });

  return { tools };
};

test.before(async t => (t.context = await makeTestContext(t)));

test('vstorage: top level keys', async t => {
  const { tools } = t.context;
  const vq = tools.makeQueryTool();

  const top = await vq.queryChildren('');
  t.log(top.length, 'keys');
  t.snapshot(top, `See https://github.com/Agoric/agoric-sdk/discussions/9115`);
});

const core = {
  agoricNames: `name service controlled by chain governance`,
  boardAux:
    'auxiliary data for brands etc. keyed by boardId (since #49 2023-09-21)',
  provisionPool: 'provideds initial IST during smart wallet provisioning',
  wallet: 'smart wallet status',
};

const seeInter = `see Inter Protocol`;

const interProtocol = {
  auction: seeInter,
  priceFeed: seeInter,
  committees: seeInter,
  psm: seeInter,
  reserve: seeInter,
  vaultFactory: seeInter,
};

const decisionRef = ({ proposal, decided }) =>
  `reserved by chain governance proposal #${proposal} decided ${decided}`;
const postBootContracts = {
  kread: decisionRef({ proposal: 53, decided: '2023-10-01' }),
  crabble: decisionRef({ proposal: 64, decided: '23-12-18' }),
};

const basics = {
  swaparoo: true,
};

test('vstorage: published.* keys', async t => {
  const { tools } = t.context;
  const vq = tools.makeQueryTool();

  const published = await vq.queryChildren('published');
  const actual = published.filter(k => !keys(basics).includes(k));
  t.log(actual.length, 'keys');
  const expected = { ...core, ...interProtocol, ...postBootContracts };
  t.snapshot(
    expected,
    `The following keys appear under published.*.
  
  see also [Inter Protocol data](https://github.com/Agoric/agoric-sdk/tree/agoric-upgrade-13/packages/inter-protocol#reading-data-off-chain).
  `,
  );
  t.deepEqual(
    fromEntries(actual.map(k => [k, true])),
    mapValues(expected, _v => true),
  );
});

test('vstorage: agoricNames hubs', async t => {
  const { tools } = t.context;
  const vq = tools.makeQueryTool();

  const hubs = await vq.queryChildren('published.agoricNames');
  t.log(hubs.length, 'keys for hubs');
  t.snapshot(
    hubs,
    `agoricNames contains several other NameHubs.
    See also [agoricNames](https://docs.agoric.com/guides/integration/name-services.html#agoricnames-agoricnamesadmin-well-known-names).`,
  );
});

const filterKeys = (kvPairs, exclude) =>
  fromEntries(kvPairs.filter(([k, _]) => !keys(exclude).includes(k)));

test('vstorage: well known contracts', async t => {
  const { tools } = t.context;
  const vq = tools.makeQueryTool();

  const info = await allValues({
    installation: vq.queryData('published.agoricNames.installation'),
    /** @type {Promise<[string, Instance][]>} */
    instance: vq.queryData('published.agoricNames.instance'),
  });
  const actual = mapValues(info, kvs => filterKeys(kvs, basics));

  for (const [k, v] of entries(actual)) {
    t.log(keys(v).length, k, 'entries');
  }
  t.snapshot(
    actual.installation,
    `published.agoricNames.installation has the contents (entries)
    of the Installation namehub. Here we show the object comprised
    of those entries.
    See also [agoricNames in vstorage](https://docs.agoric.com/guides/integration/name-services.html#agoricnames-in-vstorage)
    regarding un-marshalling the data using board IDs.`,
  );
  t.snapshot(
    actual.instance,
    `published.agoricNames.instance has the contents (entries) of the Instance namehub.`,
  );
});

test('vstorage: well-known assets', async t => {
  const { tools } = t.context;
  const vq = tools.makeQueryTool();

  const info = await allValues({
    issuer: vq.queryData('published.agoricNames.issuer'),
    brand: vq.queryData('published.agoricNames.brand'),
    oracleBrand: vq.queryData('published.agoricNames.oracleBrand'),
    vbankAsset: vq.queryData('published.agoricNames.vbankAsset'),
  });
  const actual = mapValues(info, kvs => filterKeys(kvs, basics));

  for (const [k, v] of entries(actual)) {
    t.log(keys(v).length, k, 'entries');
  }

  t.snapshot(
    actual.issuer,
    `published.agoricNames.issuer has Issuers of well-known assets.`,
  );
  t.snapshot(
    actual.brand,
    `published.agoricNames.issuer has the well-known Brands.`,
  );
  t.snapshot(
    actual.oracleBrand,
    `published.agoricNames.issuer has the well-known oracle brands.`,
  );
  t.snapshot(
    actual.vbankAsset,
    `published.agoricNames.issuer shows denoms registered with the vbank.`,
  );
});

test('boardAux', async t => {
  const { tools } = t.context;
  const vq = tools.makeQueryTool();

  const ids = await vq.queryChildren('published.boardAux');
  t.log(ids.length, 'items from the board');
  t.snapshot(
    ids.slice(0, 3),
    `The keys under published.boardAux.* are board IDs.
      Here we show a handful.`,
  );

  const aux = await allValues(
    fromEntries(
      ids.slice(1, 3).map(id => [id, vq.queryData(`published.boardAux.${id}`)]),
    ),
  );
  t.snapshot(
    aux,
    `The data are auxiliary info about objects in the board;
  for example, displayInfo of brands, including assetKind.`,
  );
});

test('vstorage: provisionPool', async t => {
  const { tools } = t.context;
  const vq = tools.makeQueryTool();

  const info = await allValues({
    governance: vq.queryData('published.provisionPool.governance'),
    metrics: vq.queryData('published.provisionPool.metrics'),
  });
  t.snapshot(
    info.governance,
    `published.provisionPool.governance
  See also Inter Protocol governance.`,
  );
  t.snapshot(info.metrics, `published.provisionPool.metrics`);
});

test('vstorage: wallet', async t => {
  const { tools } = t.context;
  const vq = tools.makeQueryTool();

  const addrs = await vq.queryChildren('published.wallet');
  t.log(addrs.length, 'smart wallets');
  t.snapshot(
    addrs.slice(0, 3),
    `The address of each provisioned smart wallet is a key under published.wallet.*.
    Here we show a hand-ful.`,
  );

  const [addr0] = addrs;
  const current = await vq.queryData(`published.wallet.${addr0}.current`);
  t.snapshot(
    current,
    'The .current child has current wallet status. For example:',
  );

  const update = await vq.queryData(`published.wallet.${addr0}`);
  t.snapshot(update, 'The address key has wallet last update. For example:');
});
