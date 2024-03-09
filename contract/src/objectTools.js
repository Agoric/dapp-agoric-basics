// @ts-check
import { E } from '@endo/far';

const { entries, fromEntries } = Object;

/** @type { <T extends Record<string, ERef<any>>>(obj: T) => Promise<{ [K in keyof T]: Awaited<T[K]>}> } */
export const allValues = async obj => {
  const es = await Promise.all(
    entries(obj).map(([k, vp]) => E.when(vp, v => [k, v])),
  );
  return fromEntries(es);
};

/** @type { <V, U, T extends Record<string, V>>(obj: T, f: (v: V) => U) => { [K in keyof T]: U }} */
export const mapValues = (obj, f) =>
  fromEntries(
    entries(obj).map(([p, v]) => {
      const entry = [p, f(v)];
      return entry;
    }),
  );

/** @type {<X, Y>(xs: X[], ys: Y[]) => [X, Y][]} */
export const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

/**
 * @template T
 * @param {T | null | undefined } x
 * @returns {T}
 */
export const NonNullish = x => {
  if (x === undefined || x === null) throw assert.error('NonNullish');
  return x;
};
