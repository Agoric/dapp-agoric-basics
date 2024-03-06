#!/usr/bin/env node
/* global process, fetch, setTimeout */
// @ts-check
import '@endo/init';
import fsp from 'node:fs/promises';
import { execFile, execFileSync } from 'node:child_process';
import { basename } from 'node:path';

import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { makeE2ETools } from '../tools/e2e-tools.js';

const opt0 = {
  service: 'agd',
  workdir: '/workspace/contract',
};

const Usage = `
deploy-contract [options] CONTRACT.js

Options:
  --help               print usage
  --name               name root for bundle, core eval (default: CONTRACT)
  --core CORE_EVAL.js  core eval entry module (cf rollup.config.mjs)
  --service SVC        docker compose service to run agd (default: ${opt0.service})
                       use . to run agd outside docker.
  --workdir DIR        workdir for docker service (default: ${opt0.workdir})
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

const mockExecutionContext = () => {
  const withSkip = o =>
    Object.assign(o, {
      skip: (...xs) => {},
    });
  return {
    log: withSkip((...args) => console.log(...args)),
    is: withSkip((actual, expected, message) =>
      assert.equal(actual, expected, message),
    ),
  };
};

const main = async (bundleDir = 'bundles') => {
  const { argv, env } = process;
  const { writeFile } = fsp;

  const progress = (...args) => console.warn(...args); // stderr

  const bundleCache = await makeNodeBundleCache(bundleDir, {}, s => import(s));

  const { flags: given, args } = getopts(argv.slice(2));
  /** @type {typeof given} */
  const flags = { ...opt0, ...given };
  if (given.help) {
    progress(Usage);
    return;
  }
  const { workdir, service } = flags;

  /** @type {import('../tools/agd-lib.js').ExecSync} */
  const dockerExec = (file, dargs, opts = { encoding: 'utf-8' }) => {
    const execArgs = ['compose', 'exec', '--workdir', workdir, service];
    opts.verbose &&
      console.log('docker compose exec', JSON.stringify([file, ...dargs]));
    return execFileSync('docker', [...execArgs, file, ...dargs], opts);
  };

  const t = mockExecutionContext();
  const tools = makeE2ETools(t, bundleCache, {
    execFile,
    execFileSync: service === '.' ? execFileSync : dockerExec,
    fetch,
    setTimeout,
    writeFile,
    bundleDir,
  });

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
