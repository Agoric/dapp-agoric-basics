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
          <div className="flex">
            <div className="h-12 px-4 py-2 text-center text-lg text-gray-900 ">
              dApp Agoric Basics
            </div>
            <div className="absolute right-0 top-0 px-2 py-1">
              <ConnectWalletButton className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700" />
            </div>
          </div>
          <div className="flex auto-rows-max place-content-center">
            <Mint />
            <div className="m-8 h-[1350px] w-0.5 bg-slate-200"></div>
            <Inventory />
          </div>
        </div>
      </ContractProvider>
    </AgoricProvider>
  );
}

export default App;
