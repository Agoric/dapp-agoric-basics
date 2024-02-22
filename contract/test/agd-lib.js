import assert from 'node:assert';

const { freeze } = Object;

const agdBinary = 'agd';

/**
 * @param {{
 *   execFileSync: typeof import('child_process').execFileSync;
 * }} io
 */
export const makeAgd = ({ execFileSync }) => {
  /**
   * @param { {
   *       home?: string;
   *       keyringBackend?: string;
   *       rpcAddrs?: string[];
   *     }} opts
   */
  const make = ({ home, keyringBackend, rpcAddrs } = {}) => {
    const keyringArgs = [
      ...(home ? ['--home', home] : []),
      ...(keyringBackend ? [`--keyring-backend`, keyringBackend] : []),
    ];
    if (rpcAddrs) {
      assert.equal(
        rpcAddrs.length,
        1,
        'XXX rpcAddrs must contain only one entry',
      );
    }
    const nodeArgs = [...(rpcAddrs ? [`--node`, rpcAddrs[0]] : [])];

    /**
     * @param {string[]} args
     * @param {import('child_process').ExecFileSyncOptionsWithStringEncoding} [opts]
     */
    const exec = (args, opts) => execFileSync(agdBinary, args, opts).toString();

    const outJson = ['--output', 'json'];

    const ro = freeze({
      status: async () => JSON.parse(exec([...nodeArgs, 'status'])),
      /**
       * @param {| [kind: 'gov', domain: string, ...rest: any]
       *         | [kind: 'tx', txhash: string]
       *         | [mod: 'vstorage', kind: 'data' | 'children', path: string],
       * } qArgs
       */
      query: async qArgs => {
        const out = exec(['query', ...qArgs, ...nodeArgs, ...outJson], {
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'ignore'],
        });

        try {
          return JSON.parse(out);
        } catch (e) {
          console.error(e);
          console.info('output:', out);
        }
      },
    });
    const nameHub = freeze({
      /**
       * NOTE: synchronous I/O
       *
       * @param {string[]} path
       */
      lookup: (...path) => {
        if (!Array.isArray(path)) {
          // TODO: use COND || Fail``
          throw TypeError();
        }
        if (path.length !== 1) {
          throw Error(`path length limited to 1: ${path.length}`);
        }
        const [name] = path;
        const txt = exec(['keys', 'show', `--address`, name, ...keyringArgs]);
        return txt.trim();
      },
    });
    const rw = freeze({
      /**
       * TODO: gas
       * @param {string[]} txArgs
       * @param {{ chainId: string; from: string; yes?: boolean }} opts
       */
      tx: async (txArgs, { chainId, from, yes }) => {
        const yesArg = yes ? ['--yes'] : [];
        const args = [
          ...nodeArgs,
          ...[`--chain-id`, chainId],
          ...keyringArgs,
          ...[`--from`, from],
          'tx',
          ...['--broadcast-mode', 'block'],
          ...txArgs,
          ...yesArg,
          ...outJson,
        ];
        const out = exec(args);
        try {
          return JSON.parse(out);
        } catch (e) {
          console.error(e);
          console.info('output:', out);
        }
      },
      ...ro,
      ...nameHub,
      readOnly: () => ro,
      nameHub: () => nameHub,
      keys: {
        /**
         * @param {string} name
         * @param {string} mnemonic
         */
        add: (name, mnemonic) => {
          return execFileSync(
            agdBinary,
            [...keyringArgs, 'keys', 'add', name, '--recover'],
            { input: mnemonic },
          ).toString();
        },
      },
      /**
       * @param {Record<string, unknown>} opts
       */
      withOpts: opts => make({ home, keyringBackend, rpcAddrs, ...opts }),
    });
    return rw;
  };
  return make();
};

/** @typedef {ReturnType<makeAgd>} Agd */
