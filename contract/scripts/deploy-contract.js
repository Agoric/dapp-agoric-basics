#!/usr/bin/env node
// @ts-check
import '@endo/init';
import fsp from 'node:fs/promises';
import { execFile, execFileSync } from 'node:child_process';
import { basename } from 'node:path';

import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { parseArgs } from 'node:util';
import { makeE2ETools } from '../tools/e2e-tools.js';

/** @type {import('node:util').ParseArgsConfig['options']} */
const options = {
  help: { type: 'boolean' },
  install: { type: 'string' },
  eval: { type: 'string', multiple: true },
  container: { type: 'string', default: 'agdc' },
  workdir: { type: 'string', default: '/ws-agoricBasics/contract' },
};
/**
 * @typedef {{
 *   help: boolean,
 *   install?: string,
 *   eval?: string[],
 *   container: string,
 *   workdir: string,
 * }} DeployOptions
 */

const Usage = `
deploy-contract [options] [--install <contract>] [--eval <proposal>]...

Options:
  --help               print usage
  --install            entry module of contract to install
  --eval               entry module of core evals to run
                       (cf rollup.config.mjs)
  --container NAME     docker container name to run agd (default: ${options.container.default})
                       Use . to run agd outside docker.
  --workdir DIR        workdir for docker container (default: ${options.workdir.default})
`;

const mockExecutionContext = () => {
  const withSkip = o =>
    Object.assign(o, {
      skip: (..._xs) => {},
    });
  return {
    log: withSkip((...args) => console.log(...args)),
    is: withSkip((actual, expected, message) =>
      assert.equal(actual, expected, message),
    ),
  };
};

const main = async (bundleDir = 'bundles') => {
  const { argv } = process;
  const { writeFile } = fsp;

  const progress = (...args) => console.warn(...args); // stderr

  const bundleCache = await makeNodeBundleCache(bundleDir, {}, s => import(s));

  /** @type {{ values: DeployOptions }} */
  // @ts-expect-error options config ensures type
  const { values: flags } = parseArgs({ args: argv.slice(2), options });
  if (flags.help) {
    progress(Usage);
    return;
  }
  /** @type {{ workdir: string, container: string }} */
  const { workdir, container } = flags;

  /** @type {import('../tools/agd-lib.js').ExecSync} */
  const dockerExec = (file, dargs, opts = { encoding: 'utf-8' }) => {
    const execArgs = ['exec', '--workdir', workdir, container];
    const fullCommand = ['docker', ...execArgs, file, ...dargs];
    console.log('Executing Docker command:', fullCommand.join(' '));
    return execFileSync('docker', [...execArgs, file, ...dargs], opts);
  };

  const t = mockExecutionContext();
  const tools = makeE2ETools(t, bundleCache, {
    execFile,
    execFileSync: container === '.' ? execFileSync : dockerExec,
    fetch,
    setTimeout,
    writeFile,
    bundleDir,
  });

  const stem = path => basename(path).replace(/\..*/, '');

  if (flags.install) {
    const name = stem(flags.install);
    await tools.installBundles({ [name]: flags.install }, progress);
  }

  if (flags.eval) {
    for await (const entryFile of flags.eval) {
      const result = await tools.runCoreEval({
        name: stem(entryFile),
        entryFile,
      });
      progress(result);
    }
  }
};

main().catch(err => console.error(err));
