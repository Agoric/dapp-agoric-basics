/**
 * @file rollup configuration to bundle core-eval script
 *
 * Supports developing core-eval script, permit as a module:
 *   - import { E } from '@endo/far'
 *     We can strip this declaration during bundling
 *     since the core-eval scope includes exports of @endo/far
 *   - `bundleID = ...` is replaced using updated/cached bundle hash
 *   - `main` export is appended as script completion value
 *   - `permit` export is emitted as JSON
 */
// @ts-check
import {
  coreEvalGlobals,
  moduleToScript,
  configureBundleID,
  emitPermit,
} from './tools/rollup-plugin-core-eval.js';
import { permit as postalServicePermit } from './src/postal-service.proposal.js';
import { permit as sellPermit } from './src/sell-concert-tickets-proposal.js';

/**
 * @param {*} opts
 * @returns {import('rollup').RollupOptions}
 */
const config1 = ({
  name,
  coreEntry,
  coreScript,
  contractEntry,
  permit,
  permitFile,
}) => ({
  input: coreEntry,
  output: {
    globals: coreEvalGlobals,
    file: coreScript,
    format: 'es',
    footer: 'main',
  },
  external: ['@endo/far'],
  plugins: [
    configureBundleID({
      name,
      rootModule: contractEntry,
      cache: 'bundles',
    }),
    moduleToScript(),
    emitPermit({ permit, file: permitFile }),
  ],
});

/** @type {import('rollup').RollupOptions[]} */
const config = [
  config1({
    name: 'postalService',
    coreEntry: './src/postal-service.proposal.js',
    coreScript: 'bundles/deploy-postal-service.js',
    contractEntry: './src/postal-service.contract.js',
    permit: postalServicePermit,
    permitFile: 'deploy-postal-service-permit.json',
  }),
  config1({
    name: 'sell-concert-tickets',
    coreEntry: './src/sell-concert-tickets-proposal.js',
    coreScript: 'bundles/deploy-sell-concert-tickets.js',
    contractEntry: './src/sell-concert-tickets.contract.js',
    permit: sellPermit,
    permitFile: 'deploy-sell-concert-tickets-permit.json',
  }),
];
export default config;
