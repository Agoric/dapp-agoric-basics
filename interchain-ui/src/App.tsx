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
          <div className="my-4 flex w-full flex-row justify-center">
            <div
              role="tablist"
              className="daisyui-tabs daisyui-tabs-lifted daisyui-tabs-lg"
            >
              {/* Mint tab */}
              <input
                type="radio"
                name="Mint"
                role="tab"
                className="daisyui-tab"
                aria-label="Mint"
                checked
              />
              <div
                role="tabpanel"
                className="daisyui-tab-content rounded-box border-base-300 bg-base-100 p-6"
              >
                {/* Mint UI */}
                <div className="flex w-full flex-row justify-center">
                  <div className="flex w-11/12 flex-row">
                    <div className="card grid h-full flex-grow place-items-center rounded-box">
                      <Mint />
                    </div>
                    <div className="daisyui-divider lg:daisyui-divider-horizontal"></div>
                    <div className="card grid h-full flex-grow place-items-center rounded-box">
                      <Inventory />
                    </div>
                  </div>
                </div>
              </div>
              {/* Swap tab */}
              <input
                type="radio"
                name="Swap"
                role="tab"
                className="daisyui-tab"
                aria-label="Swap"
              />
              <div
                role="tabpanel"
                className="daisyui-tab-content rounded-box border-base-300 bg-base-100 p-6"
              ></div>
              {/* Pay tab */}
              <input
                type="radio"
                name="Pay"
                role="tab"
                className="daisyui-tab"
                aria-label="Pay"
              />
              <div
                role="tabpanel"
                className="daisyui-tab-content rounded-box border-base-300 bg-base-100 p-6"
              ></div>
              {/* Vote tab */}
              <input
                type="radio"
                name="Vote"
                role="tab"
                className="daisyui-tab"
                aria-label="Vote"
              />
              <div
                role="tabpanel"
                className="daisyui-tab-content rounded-box border-base-300 bg-base-100 p-6"
              ></div>
            </div>
          </div>
        </div>
      </ContractProvider>
    </AgoricProvider>
  );
}

export default App;
