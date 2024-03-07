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
import { nodeResolve } from '@rollup/plugin-node-resolve';
import {
  coreEvalGlobals,
  moduleToScript,
  configureBundleID,
  emitPermit,
} from './tools/rollup-plugin-core-eval.js';
import { permit as postalServicePermit } from './src/postal-service.proposal.js';
import { permit as sellPermit } from './src/sell-concert-tickets-proposal.js';
import { permit as endo1Permit } from './src/platform-goals/endo1.core.js';
import { permit as boardAuxPermit } from './src/platform-goals/board-aux.core.js';

/**
 * @param {*} opts
 * @returns {import('rollup').RollupOptions}
 */
const config1 = ({
  name,
  coreEntry,
  contractEntry = `./src/${name}.contract.js`,
  coreScript = `bundles/deploy-${name}.js`,
  permitFile = `deploy-${name}-permit.json`,
  permit,
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
    nodeResolve(),
    ...(contractEntry
      ? [
          configureBundleID({
            name,
            rootModule: contractEntry,
            cache: 'bundles',
          }),
        ]
      : []),
    moduleToScript(),
    emitPermit({ permit, file: permitFile }),
  ],
});

/** @type {import('rollup').RollupOptions[]} */
const config = [
  config1({
    name: 'endo1',
    permit: endo1Permit,
    coreEntry: `./src/platform-goals/endo1.core.js`,
    contractEntry: null,
  }),
  config1({
    name: 'board-aux',
    permit: boardAuxPermit,
    coreEntry: `./src/platform-goals/board-aux.core.js`,
    contractEntry: null,
  }),
  config1({
    name: 'sell-concert-tickets',
    coreEntry: `./src/sell-concert-tickets-proposal.js`,
    permit: sellPermit,
  }),
  config1({
    name: 'postal-service',
    coreEntry: `./src/postal-service.proposal.js`,
    permit: postalServicePermit,
  }),
];
export default config;
