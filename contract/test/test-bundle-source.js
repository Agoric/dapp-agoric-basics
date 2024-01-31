/**
 * @file Test using bundleSource() on the contract.
 */

// @ts-check

// eslint-disable-next-line import/no-unresolved -- https://github.com/avajs/ava/issues/2951
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import bundleSource from '@endo/bundle-source';
import { makeZoeKitForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E, passStyleOf } from '@endo/far';
import { createRequire } from 'module';

const myRequire = createRequire(import.meta.url);
const contractPath = myRequire.resolve(`../src/agoric-basics-contract.js`);

test('bundleSource() bundles the contract for use with zoe', async t => {
  const bundle = await bundleSource(contractPath);
  t.is(bundle.moduleFormat, 'endoZipBase64');
  t.log(bundle.endoZipBase64Sha512);
  t.true(bundle.endoZipBase64.length > 10_000);

  const { zoeService: zoe } = makeZoeKitForTest();
  const installation = await E(zoe).install(bundle);
  t.log(installation);
  t.is(passStyleOf(installation), 'remotable');
});
