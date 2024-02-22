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
import { permit } from './src/start-postalSvc.js';

/** @type {import('rollup').RollupOptions} */
const config = {
  output: {
    globals: coreEvalGlobals,
    file: 'bundles/deploy-send.js',
    format: 'es',
    footer: 'main',
  },
  external: ['@endo/far'],
  plugins: [
    configureBundleID({
      name: 'postalSvc',
      rootModule: './src/postalSvc.js',
      cache: 'bundles',
    }),
    moduleToScript(),
    emitPermit({ permit, file: 'deploy-send-permit.json' }),
  ],
};
export default config;
