import { Far, makeMarshal } from '@endo/marshal';

/**
 * @template Val
 * @param {(val: Val, size: number) => string} makeSlot
 * @param {(slot: string, iface: string | undefined) => Val} makeVal
 */
const makeTranslationTable = (makeSlot, makeVal) => {
  /** @type {Map<Val, unknown>} */
  const valToSlot = new Map();
  /** @type {Map<unknown, Val>} */
  const slotToVal = new Map();

  /** @type {(val: Val) => string} */
  const convertValToSlot = val => {
    if (valToSlot.has(val)) return valToSlot.get(val);
    const slot = makeSlot(val, valToSlot.size);
    valToSlot.set(val, slot);
    slotToVal.set(slot, val);
    return slot;
  };

  /** @type {(slot: string | null, iface: string | undefined) => Val} */
  const convertSlotToVal = (slot, iface) => {
    if (slot === null) return makeVal(slot, iface);
    if (slotToVal.has(slot)) return slotToVal.get(slot);
    const val = makeVal(slot, iface);
    valToSlot.set(val, slot);
    slotToVal.set(slot, val);
    return val;
  };

  return harden({ convertValToSlot, convertSlotToVal });
};

/** @type {(slot: string, iface: string | undefined) => any} */
const synthesizeRemotable = (slot, iface) =>
  Far(`${(iface ?? '').replace(/^Alleged: /, '')}#${slot}`, {});

/** @param {(v: unknown) => string} [valToSlot] */
export const makeClientMarshaller = valToSlot => {
  const noNewSlots = val => {
    throw new Error(`unknown value: ${val}`);
  };
  const { convertValToSlot, convertSlotToVal } = makeTranslationTable(
    valToSlot || noNewSlots,
    synthesizeRemotable,
  );

  return makeMarshal(convertValToSlot, convertSlotToVal, {
    serializeBodyFormat: 'smallcaps',
  });
};
