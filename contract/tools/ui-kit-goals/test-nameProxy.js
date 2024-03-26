import '@endo/init/debug.js';
import test from 'ava';

import { M } from '@endo/patterns';
import { makeExo } from '@endo/exo';
import { makeNameHubKit } from '@agoric/vats';
import { makeNameProxy } from './name-service-client.js';

test('makeNameProxy makes NameHub lookup convenient', async t => {
  const k0 = makeNameHubKit();
  const kb = makeNameHubKit();
  k0.nameAdmin.update('brand', kb.nameHub, kb.nameAdmin);
  const atomBrand = makeExo('Atom Brand', M.interface('Atom Brand', {}, { defaultGuards: 'passable' }), {});
  kb.nameAdmin.update('Atom', atomBrand);

  const agoricNames = k0.nameHub;

  const A = makeNameProxy(agoricNames);

  const ab = await A.brand.Atom;
  t.log('brand', ab);
  t.is(ab, atomBrand);

  const b = await A.brand;
  t.log('hub', b);
  t.is(b, kb.nameHub);
});
