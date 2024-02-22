// @ts-check

import { E, Far } from '@endo/far';
import { batchVstorageQuery } from './batchQuery.js';
import { makeClientMarshaller } from './marshalTables.js';

/**
 * Iter tools...
 *
 * @template {Promise} PT
 * @param {() => PT} fn
 * @param {{ delay: (ms: number) => Promise<void>, period?: number }} opts
 */
export async function* poll(fn, { delay, period = 1000 }) {
  await null;
  for (;;) {
    const x = await fn();
    yield x;
    await delay(period);
  }
}

/**
 * @template {Promise} PT
 * @param {AsyncGenerator<Awaited<PT>>} src
 * @param {(a: unknown, b: unknown) => boolean} [equal]
 */
export async function* dedup(src, equal = (x, y) => x === y) {
  let last;
  for await (const x of src) {
    if (!equal(x, last)) {
      yield x;
      last = x;
    }
  }
}

/**
 * @template {Promise} PT
 * @template {Promise} PU
 * @param {AsyncGenerator<Awaited<PT>>} src
 * @param {(x: Awaited<PT>) => PU} fn
 */
export async function* mapIter(src, fn) {
  for await (const item of src) {
    yield fn(item);
  }
}

/**
 * @param {string} key
 * @param {object} io
 * @param {import('./batchQuery.js').VStorage} io.vstorage
 * @param {(ms: number, opts?: unknown) => Promise<void>} io.delay
 */
export async function* eachVstorageUpdate(key, { vstorage, delay }) {
  const { stringify: q } = JSON;
  const updates = dedup(
    poll(() => vstorage.readCell(key, { kind: 'data' }), {
      delay,
      period: 2000,
    }),
    (a, b) => q(a) === q(b),
  );

  for await (const cell of updates) {
    // use blockHeight?
    const { values } = cell;
    for (const value of values) {
      yield value;
    }
  }
}

const pmethods = harden(['then', 'catch', 'finally']);

// See also: https://github.com/endojs/endo/tree/mfig-o/packages/o
/** @param {ERef<Pick<NameHub, 'lookup'>>} nodeP */
export const makeNameProxy = nodeP =>
  new Proxy(nodeP, {
    get(target, prop, _rx) {
      assert.typeof(prop, 'string');
      if (pmethods.includes(prop)) {
        return target[prop].bind(target);
      }
      return makeNameProxy(E(target).lookup(prop));
    },
  });

/**
 * @param {string} addr
 * @param {object} powers
 * @param {QueryTool} powers.query
 * @param {import('./batchQuery.js').VStorage} powers.vstorage
 */
export const makeWalletView = (addr, { query, vstorage }) => {
  return Far('WalletQuery', {
    current: () => query.queryData(`published.wallet.${addr}.current`),
    /**
     * TODO: visit in chunks by block
     * @param {ERef<{visit: (r: import('@agoric/smart-wallet/src/smartWallet.js').UpdateRecord) => void}>} visitor
     * @param {number} [minHeight]
     */
    history: async (visitor, minHeight) => {
      const history = vstorage.readHistoryBy(
        s => query.fromCapData(JSON.parse(s)),
        `published.wallet.${addr}`,
        minHeight,
      );
      for await (const record of history) {
        await E(visitor).visit(record);
      }
    },
  });
};
/** @typedef {ReturnType<typeof makeWalletView>} WalletView } */

/** @param {Pick<QueryTool, 'queryData'>} qt */
export const makeAgoricNames = async qt => {
  assert(qt);
  const nameHubCache = new Map();

  /** @param {string} kind */
  const lookupKind = async kind => {
    assert.typeof(kind, 'string');
    if (nameHubCache.has(kind)) {
      return nameHubCache.get(kind);
    }
    const entries = await qt.queryData(`published.agoricNames.${kind}`);
    const record = Object.fromEntries(entries);
    const hub = Far('NameHub', {
      lookup: name => record[name],
      keys: () => entries.map(e => e[0]),
      entries: () => entries,
    });
    nameHubCache.set(kind, hub);
    return hub;
  };

  const invalidate = () => {
    nameHubCache.clear();
  };

  const hub0 = Far('Hub', {
    lookup: async (kind, ...more) => {
      const hub2 = lookupKind(kind);
      if (more.length > 0) {
        return E(hub2).lookup(...more);
      }
      return hub2;
    },
  });

  return { lookup: hub0.lookup, invalidate };
};

/**
 * @param {import('./batchQuery.js').VStorage} vstorage
 * @param {import('@endo/marshal').Marshal<string | null>} [m]
 */
export const makeQueryKit = (vstorage, m = makeClientMarshaller()) => {
  /** @param {['children' | 'data', string][]} paths */
  const batchQuery = async paths =>
    batchVstorageQuery(vstorage, m.fromCapData, paths);

  /** @param {string} path */
  const queryData = async path => {
    const [[_p, answer]] = await batchQuery([['data', path]]);
    if (typeof answer === 'string') return answer;
    if (answer.error) throw Error(answer.error);
    return answer.value;
  };

  /** @param {string} path */
  const queryChildren = async path => {
    const [[_p, answer]] = await batchQuery([['children', path]]);
    if (typeof answer === 'string') return answer;
    if (answer.error) throw Error(answer.error);
    return answer.value;
  };

  async function* follow(path, { delay }) {
    for await (const txt of eachVstorageUpdate(path, { vstorage, delay })) {
      const value = m.fromCapData(JSON.parse(txt));
      yield value;
    }
  }

  const query = Far('QueryTool', {
    batchQuery,
    queryData,
    follow,
    queryChildren,
    fromCapData: m.fromCapData,
    toCapData: m.toCapData,
    // XXX wrong layer? add makeWalletView(query) helper function instead?
    walletView: addr => makeWalletView(addr, { query, vstorage }),
  });

  return { vstorage, query };
};
/** @typedef {Awaited<ReturnType<typeof makeQueryKit>>['query']} QueryTool */
