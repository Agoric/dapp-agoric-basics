#!/usr/bin/env node
/* global process, fetch, setTimeout */
// @ts-check
import '@endo/init';
import fsp from 'node:fs/promises';
import { execFile, execFileSync } from 'node:child_process';

import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { makeE2ETools } from '../tools/e2e-tools.js';

const main = async (bundleDir = 'bundles') => {
  const { argv, env } = process;
  const { writeFile } = fsp;

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
