#!/usr/bin/env node
/* global process, fetch, setTimeout */
// @ts-check
import '@endo/init';
import fsp from 'node:fs/promises';
import { execFile, execFileSync } from 'node:child_process';

import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { makeE2ETools } from '../tools/e2e-tools.js';

/**
 * @template T
 * @param {T | null | undefined } x
 * @returns {T}
 */
const NonNullish = x => {
  if (x === undefined || x === null) throw assert.error('NonNullish');
  return x;
};

/**
 * @param {string[]} args
 * @param {{ [k: string]: boolean | undefined }} [style]
 */
const getopts = (args, style = {}) => {
  /** @type {{ [k: string]: string}} */
  const flags = {};
  while (args.length > 0) {
    const arg = NonNullish(args.shift());
    if (arg.startsWith('--')) {
      const name = arg.slice('--'.length);
      if (style[name] === true) {
        flags[name] = '';
        continue;
      }
      if (args.length <= 0) throw RangeError(`no value for ${arg}`);
      flags[name] = NonNullish(args.shift());
    }
  }
  return harden(flags);
};

const main = async (bundleDir = 'bundles') => {
  const { argv, env } = process;
  const { writeFile } = fsp;

  const opts = getopts(argv.slice(2));
  const bundleCache = makeNodeBundleCache(bundleDir, {}, s => import(s));

  const t = {
    log: console.log,
    is: (actual, expected, message) => assert.equal(actual, expected, message),
  };

  const tools = makeE2ETools(t, bundleCache, {
    execFile,
    execFileSync,
    fetch,
    setTimeout,
    writeFile,
    bundleDir,
  });

  const qt = tools.makeQueryTool();
  const brand = await qt.queryData('published.agoricNames.brand');
  console.log(brand);
};

main().catch(err => console.error(err));
