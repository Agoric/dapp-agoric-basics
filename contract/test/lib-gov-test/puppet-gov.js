// @ts-check
// borrowed from https://github.com/Agoric/agoric-sdk/blob/master/packages/inter-protocol/test/supports.js
import { E } from '@endo/far';
import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);
const assets = {
  binaryVoteCounter: nodeRequire.resolve(
    '@agoric/governance/src/binaryVoteCounter.js',
  ),
  committeBundle: nodeRequire.resolve('@agoric/governance/src/committee.js'),
  puppetContractGovernor: nodeRequire.resolve(
    '@agoric/governance/tools/puppetContractGovernor.js',
  ),
};

/**
 * Install governance contracts, with a "puppet" governor for use in tests.
 *
 * @param {ERef<ZoeService>} zoe
 * @param {BootstrapPowers['installation']['produce']} produce
 * @param {BundleCache} bundleCache
 *
 * @typedef {Awaited<ReturnType<typeof import('@endo/bundle-source/cache.js').makeNodeBundleCache>>} BundleCache
 */
export const installPuppetGovernance = async (zoe, produce, bundleCache) => {
  const committeeBundle = await bundleCache.load(
    assets.committeBundle,
    'committee',
  );

  produce.committee.resolve(E(zoe).install(committeeBundle));
  produce.contractGovernor.resolve(
    E(zoe).install(await bundleCache.load(assets.puppetContractGovernor)),
  );
  // ignored by puppetContractGovernor but expected by something
  produce.binaryVoteCounter.resolve(
    E(zoe).install(await bundleCache.load(assets.binaryVoteCounter)),
  );
};
