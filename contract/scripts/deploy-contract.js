#!/usr/bin/env node
/* global process, fetch, setTimeout */
// @ts-check
import '@endo/init';
import fsp from 'node:fs/promises';
import { execFile, execFileSync } from 'node:child_process';
import { basename } from 'node:path';

import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { makeE2ETools } from '../tools/e2e-tools.js';

const Usage = `
deploy-contract CONTRACT.js [--core CORE_EVAL.js]
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
 * @param {string[]} argv
 * @param {{ [k: string]: boolean | undefined }} [style]
 */
const getopts = (argv, style = {}) => {
  /** @type {{ [k: string]: string}} */
  const flags = {};
  const args = [];
  while (argv.length > 0) {
    const arg = NonNullish(argv.shift());
    if (arg.startsWith('--')) {
      const name = arg.slice('--'.length);
      if (style[name] === true) {
        flags[name] = '';
        continue;
      }
      if (argv.length <= 0) throw RangeError(`no value for ${arg}`);
      flags[name] = NonNullish(argv.shift());
    } else {
      args.push(arg);
    }
  }
  return harden({ flags, args });
};

const main = async (bundleDir = 'bundles') => {
  const { argv, env } = process;
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

  const tools = makeE2ETools(t, bundleCache, {
    execFile,
    execFileSync: dockerExec,
    fetch,
    setTimeout,
    writeFile,
    bundleDir,
  });

  const { flags, args } = getopts(argv.slice(2));
  const [entry] = args;
  if (!entry) throw Error(Usage);

  const name =
    flags.name ||
    basename(entry)
      .replace(/\.js$/, '')
      .replace(/\.contract$/, '');

  await tools.installBundles({ [name]: entry }, progress);

  if (flags.core) {
    const result = await tools.runCoreEval({
      name,
      entryFile: flags.core,
    });
    progress(result);
  }
};

main().catch(err => console.error(err));
