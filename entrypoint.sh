#!/bin/bash
set -x
cp -r /usr/src/cache/node_modules /workspaces/dapp-agoric-basics/
/workspaces/dapp-agoric-basics/make_ports_public.sh 5173 1317 26657 26656
exec /bin/bash