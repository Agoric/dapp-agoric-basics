import { Mint } from './components/Mint';
import { Inventory } from './components/Inventory';
import { ContractProvider } from './providers/Contract';
import { AgoricProvider, ConnectWalletButton } from '@agoric/react-components';
import { wallets } from 'cosmos-kit';
import '@agoric/react-components/dist/style.css';
import { TabWrapper } from './components/TabWrapper';
import { useState } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState('Mint');

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
  };

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
              <TabWrapper
                tab="Mint"
                activeTab={activeTab}
                handleTabClick={handleTabClick}
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
              </TabWrapper>
              <TabWrapper
                tab="Swap"
                activeTab={activeTab}
                handleTabClick={handleTabClick}
              >
                <div>TBD</div>
              </TabWrapper>
              <TabWrapper
                tab="Pay"
                activeTab={activeTab}
                handleTabClick={handleTabClick}
              >
                <div>TBD</div>
              </TabWrapper>
              <TabWrapper
                tab="Vote"
                activeTab={activeTab}
                handleTabClick={handleTabClick}
              >
                <div>TBD</div>
              </TabWrapper>
            </div>
          </div>
        </div>
      </ContractProvider>
    </AgoricProvider>
  );
}

export default App;
