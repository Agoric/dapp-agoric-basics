import { Mint } from './components/Mint';
import { Inventory } from './components/Inventory';
import { ContractProvider } from './providers/Contract';
import { AgoricProvider, ConnectWalletButton } from '@agoric/react-components';
import { wallets } from 'cosmos-kit';
import '@agoric/react-components/dist/style.css';

function App() {
  return (
    <AgoricProvider
      wallets={wallets.extension}
      defaultNetworkConfig={{
        testChain: {
          chainId: 'agoriclocal',
          chainName: 'agoric-local',
        },
        apis: {
          rest: ['http://localhost:1317'],
          rpc: ['http://localhost:26657'],
        },
      }}
    >
      <ContractProvider>
        <div>
          {/* navbar */}
          <div className="daisyui-navbar bg-neutral text-neutral-content">
            {/* Agoric logo */}
            <div className="flex-none">
              <button className="daisyui-btn daisyui-btn-square daisyui-btn-ghost">
                <img src="/agoric.svg" />
              </button>
            </div>
            {/* dApp title */}
            <div className="flex-1">
              <button className="daisyui-btn daisyui-btn-ghost text-xl">
                dApp Agoric Basics
              </button>
            </div>
            {/* connect wallet button */}
            <div className="flex-none">
              <ConnectWalletButton className="daisyui-btn daisyui-btn-outline daisyui-btn-secondary" />
            </div>
          </div>
          {/* tabs */}
          <div role="tablist" className="daisyui-tabs-boxed daisyui-tabs">
            <a role="tab" className="daisyui-tab daisyui-tab-active">
              Mint
            </a>
            <a role="tab" className="daisyui-tab">
              Swap
            </a>
            <a role="tab" className="daisyui-tab">
              Pay
            </a>
            <a role="tab" className="daisyui-tab">
              Vote
            </a>
          </div>
          {/* main app UI */}
          <div className="flex w-full flex-row items-center">
            <div className="card grid h-full flex-grow place-items-center rounded-box bg-base-300">
              <Mint />
            </div>
            <div className="daisyui-divider lg:daisyui-divider-horizontal"></div>
            <div className="card grid h-full flex-grow place-items-center rounded-box bg-base-300">
              <Inventory />
            </div>
          </div>
        </div>
      </ContractProvider>
    </AgoricProvider>
  );
}

export default App;
