// @ts-check
import { E } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';

console.warn('start proposal module evaluating');

const { Fail } = assert;

// vstorage paths under published.*
const BOARD_AUX = 'boardAux';

const marshalData = makeMarshal(_val => Fail`data only`);

const IST_UNIT = 1_000_000n;

export const makeInventory = (brand, baseUnit) => {
  return {
    frontRow: {
      tradePrice: AmountMath.make(brand, baseUnit * 3n),
      maxTickets: 3n,
    },
    middleRow: {
      tradePrice: AmountMath.make(brand, baseUnit * 2n),
      maxTickets: 3n,
    },
    lastRow: {
      tradePrice: AmountMath.make(brand, baseUnit * 1n),
      maxTickets: 3n,
    },
  };
};

export const makeTerms = (brand, baseUnit) => {
  return {
    inventory: makeInventory(brand, baseUnit),
  };
};

/**
 * Make a storage node for auxilliary data for a value on the board.
 *
 * @param {ERef<StorageNode>} chainStorage
 * @param {string} boardId
 */
const makeBoardAuxNode = async (chainStorage, boardId) => {
  const boardAux = E(chainStorage).makeChildNode(BOARD_AUX);
  return E(boardAux).makeChildNode(boardId);
};

const publishBrandInfo = async (chainStorage, board, brand) => {
  const [id, displayInfo] = await Promise.all([
    E(board).getId(brand),
    E(brand).getDisplayInfo(),
  ]);
  const node = makeBoardAuxNode(chainStorage, id);
  const aux = marshalData.toCapData(harden({ displayInfo }));
  await E(node).setValue(JSON.stringify(aux));
};

/**
 * Core eval script to start contract
 *
 * @param {BootstrapPowers} permittedPowers
 */
export const startAgoricBasicsContract = async permittedPowers => {
  console.error('startAgoricBasicsContract()...');
  const {
    consume: { board, chainStorage, startUpgradable, zoe },
    brand: {
      consume: { IST: istBrandP },
      // @ts-expect-error dynamic extension to promise space
      produce: { Ticket: produceTicketBrand },
    },
    issuer: {
      consume: { IST: istIssuerP },
      // @ts-expect-error dynamic extension to promise space
      produce: { Ticket: produceTicketIssuer },
    },
    installation: {
      consume: { agoricBasics: agoricBasicsInstallationP },
    },
    instance: {
      // @ts-expect-error dynamic extension to promise space
      produce: { agoricBasics: produceInstance },
    },
  } = permittedPowers;

  const istIssuer = await istIssuerP;
  const istBrand = await istBrandP;

  const terms = makeTerms(istBrand, 1n * IST_UNIT);

  // agoricNames gets updated each time; the promise space only once XXXXXXX
  const installation = await agoricBasicsInstallationP;

  const { instance } = await E(startUpgradable)({
    installation,
    issuerKeywordRecord: { Price: istIssuer },
    label: 'agoricBasics',
    terms,
  });
  console.log('CoreEval script: started contract', instance);
  const {
    brands: { Ticket: brand },
    issuers: { Ticket: issuer },
  } = await E(zoe).getTerms(instance);

  console.log('CoreEval script: share via agoricNames:', brand);

  produceInstance.reset();
  produceInstance.resolve(instance);

  produceTicketBrand.reset();
  produceTicketIssuer.reset();
  produceTicketBrand.resolve(brand);
  produceTicketIssuer.resolve(issuer);

  await publishBrandInfo(chainStorage, board, brand);
  console.log('agoricBasics (re)started');
};

/** @type { import("@agoric/vats/src/core/lib-boot").BootstrapManifest } */
const agoricBasicsManifest = {
  [startAgoricBasicsContract.name]: {
    consume: {
      agoricNames: true,
      board: true, // to publish boardAux info for NFT brand
      chainStorage: true, // to publish boardAux info for NFT brand
      startUpgradable: true, // to start contract and save adminFacet
      zoe: true, // to get contract terms, including issuer/brand
    },
    installation: { consume: { agoricBasics: true } },
    issuer: { consume: { IST: true }, produce: { Ticket: true } },
    brand: { consume: { IST: true }, produce: { Ticket: true } },
    instance: { produce: { agoricBasics: true } },
  },
};
harden(agoricBasicsManifest);

export const getManifestForAgoricBasics = (
  { restoreRef },
  { agoricBasicsRef },
) => {
  return harden({
    manifest: agoricBasicsManifest,
    installations: {
      agoricBasics: restoreRef(agoricBasicsRef),
    },
  });
};
