import { E, Far } from '@endo/far';
import { batchVstorageQuery, makeVStorage } from './batchQuery.js';
import { makeClientMarshaller } from './marshalTables.js';

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
     * @param {ERef<{visit: (r: UpdateRecord) => void}>} visitor
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

/** @param {ERef<LCD>} lcd */
export const makeQueryKit = lcd => {
  const m = makeClientMarshaller();
  const vstorage = makeVStorage(lcd);

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

  const nameHubCache = new Map();

  /** @param {string} kind */
  const lookupKind = async kind => {
    assert.typeof(kind, 'string');
    if (nameHubCache.has(kind)) {
      return nameHubCache.get(kind);
    }
    const entries = await queryData(`published.agoricNames.${kind}`);
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

  /**
   * @param {string} first
   * @param {string} kind
   * @param {string} [name]
   */
  const lookup = async (first, kind, name) => {
    assert.equal(first, 'agoricNames');
    const hub = await lookupKind(kind);
    if (!name) return hub;
    return hub.lookup(name);
  };

  const query = Far('QueryTool', {
    batchQuery,
    queryData,
    queryChildren,
    lookup,
    invalidate,
    fromCapData: m.fromCapData,
    toCapData: m.toCapData,
    // XXX wrong layer? add makeWalletView(query) helper function instead?
    walletView: addr => makeWalletView(addr, { query, vstorage }),
  });

  return { vstorage, query };
};
/** @typedef {Awaited<ReturnType<typeof makeQueryKit>>['query']} QueryTool */
