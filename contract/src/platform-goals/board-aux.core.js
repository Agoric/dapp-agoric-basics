// @ts-check
import { E, Far } from '@endo/far';

const { Fail } = assert;

// vstorage paths under published.*
const BOARD_AUX = 'boardAux';

/**
 * @param {import('@agoric/zone').Zone} zone
 * @param {Marshaller} marshalData
 * @param {{
 *   board: ERef<import('./core-types').Board>;
 *   chainStorage: ERef<StorageNode>;
 * }} powers
 */
export const makeBoardAuxManager = (zone, marshalData, powers) => {
  const { board, chainStorage } = powers;
  const store = zone.mapStore('boardAux');
  const boardAux = E(chainStorage).makeChildNode(BOARD_AUX);

  const formatValue = value => {
    const aux = marshalData.toCapData(value);
    // max length?
    return JSON.stringify(aux);
  };

  const boardAuxNode = key =>
    E.when(E(board).getId(key), boardId => E(boardAux).makeChildNode(boardId));

  const init = async (key, value) => {
    store.init(key, value);
    await E(boardAuxNode(key)).setValue(formatValue(value));
  };

  const update = async (key, value) => {
    if (store.has(key)) {
      store.set(key, value);
    } else {
      store.init(key, value);
    }
    await E(boardAuxNode(key)).setValue(formatValue(value));
  };

  /**
   * Publish displayInfo of a brand to vstorage under its boardId.
   *
   * Works only once per brand.
   * @see {BoardAuxAdmin} to over-write aux info
   *
   * @param {Brand} brand
   */
  const publishBrandInfo = brand =>
    E.when(
      Promise.all([E(brand).getAllegedName(), E(brand).getDisplayInfo()]),
      ([allegedName, displayInfo]) =>
        init(brand, harden({ allegedName, displayInfo })),
    );

  return harden({
    brandAuxPublisher: Far('BrandAuxPublisher', { publishBrandInfo }),
    boardAuxTOFU: Far('BoardAuxTOFU', { publishBrandInfo, init }),
    boardAuxAdmin: Far('BoardAuxAdmin', { publishBrandInfo, init, update }),
  });
};
/** @typedef {ReturnType<typeof makeBoardAuxManager>} BoardAuxManager */

/** @typedef {BoardAuxManager['brandAuxPublisher']} BrandAuxPublisher */
/** @typedef {BoardAuxManager['boardAuxTOFU']} BoardAuxTOFU */
/** @typedef {BoardAuxManager['boardAuxAdmin']} BoardAuxAdmin */

/**
 * @typedef {import('./core-types').PromiseSpaceOf<{
 *   brandAuxPublisher: BrandAuxPublisher;
 *   boardAuxTOFU: BoardAuxTOFU;
 *   boardAuxAdmin: BoardAuxAdmin;
 * }>} BoardAuxPowers
 */

// XXX works for DisplayInfo, i.e. plain JSON struff.
const marshalData = harden({
  toCapData: d => harden({ body: `#${JSON.stringify(d)}`, slots: [] }),
  fromCapData: () => Fail`not implemented`,
  serialize: () => Fail`not implemented`,
  unserialize: () => Fail`not implemented`,
});

/**
 * @param {import('./core-types').BootstrapPowers
 *   & BoardAuxPowers
 * } powers
 */
export const produceBoardAuxManager = async powers => {
  const { zone } = powers;
  const { board, chainStorage } = powers.consume;

  const mgr = makeBoardAuxManager(zone, marshalData, { board, chainStorage });
  powers.produce.brandAuxPublisher.reset();
  // TODO: powers.produce.boardAuxTOFU.reset();
  powers.produce.boardAuxAdmin.reset();
  powers.produce.brandAuxPublisher.resolve(mgr.brandAuxPublisher);
  // TODO: powers.produce.boardAuxTOFU.resolve(mgr.boardAuxTOFU);
  powers.produce.boardAuxAdmin.resolve(mgr.boardAuxAdmin);
};

export const permit = {
  zone: true,
  consume: { board: true, chainStorage: true },
  produce: {
    brandAuxPublisher: true,
    // TODO: boardAuxTOFU: true,
    boardAuxAdmin: true,
  },
};

export const main = produceBoardAuxManager;
