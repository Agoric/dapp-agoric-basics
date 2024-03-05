#!/usr/bin/env node
/* global process, fetch, setTimeout */
// @ts-check
import '@endo/init';
import fsp from 'node:fs/promises';
import { execFile, execFileSync } from 'node:child_process';
import { basename } from 'node:path';

import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { makeE2ETools } from '../tools/e2e-tools.js';
import { getBundleId } from '../tools/bundle-tools.js';

const Usage = `
deploy-contract CONTRACT.js
`;

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
  const [entry] = argv.slice(2);
  if (!entry) throw Error(Usage);
  const { writeFile } = fsp;

  const progress = (...args) => console.warn(...args); // stderr

  const bundleCache = await makeNodeBundleCache(bundleDir, {}, s => import(s));

  const t = {
    log: console.log,
    is: (actual, expected, message) => assert.equal(actual, expected, message),
  };

  /** @type {import('../tools/agd-lib.js').ExecSync} */
  const dockerExec = (file, args, opts = { encoding: 'utf-8' }) => {
    const workdir = '/workspace/contract';
    const execArgs = ['compose', 'exec', '--workdir', workdir, 'agd'];
    opts.verbose &&
      console.log('docker compose exec', JSON.stringify([file, ...args]));
    return execFileSync('docker', [...execArgs, file, ...args], opts);
  };

  const opts = getopts(argv.slice(2));

  const tools = makeE2ETools(t, bundleCache, {
    execFile,
    execFileSync: dockerExec,
    fetch,
    setTimeout,
    writeFile,
    bundleDir,
  });

  const name = basename(entry)
    .replace(/\.js$/, '')
    .replace(/\.contract$/, '');

  const bundles = await tools.installBundles({ [name]: entry }, progress);
};

main().catch(err => console.error(err));
