import { Mint } from './components/Mint';
import { Inventory } from './components/Inventory';
import { ContractProvider } from './providers/Contract';
import { AgoricProvider } from '@agoric/react-components';
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
        <div className="flex auto-rows-max place-content-center">
          <Mint />
          <div className="m-8 h-[1200px] w-0.5 bg-slate-200"></div>
          <Inventory />
        </div>
      </ContractProvider>
    </AgoricProvider>
  );
}

export default App;
