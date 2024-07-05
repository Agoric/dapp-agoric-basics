import { ContractProvider } from './providers/Contract';
import { AgoricProvider } from '@agoric/react-components';
import { Navbar } from './components/Navbar';
import { Tabs } from './components/Tabs';
import { wallets } from 'cosmos-kit';
import { ThemeProvider, useTheme } from '@interchain-ui/react';
import '@agoric/react-components/dist/style.css';

function App() {
  const { themeClass } = useTheme();

  return (
    <ThemeProvider>
      <div className={themeClass}>
        <AgoricProvider
          wallets={wallets.extension}
          agoricNetworkConfigs={[
            {
              testChain: {
                chainId: 'agoriclocal',
                chainName: 'agoric-local',
                iconUrl: 'agoric.svg', // Optional icon for dropdown display
              },
              apis: {
                rest: [`https://solid-enigma-4vjj94wjqrxc7xrg-1317.app.github.dev/`],
                rpc: [`https://solid-enigma-4vjj94wjqrxc7xrg-26657.app.github.dev/`],
              },
            },
          ]}
          defaultChainName="agoric-local"
        >
          <ContractProvider>
            <Navbar />
            <Tabs />
          </ContractProvider>
        </AgoricProvider>
      </div>
    </ThemeProvider>
  );
}

export default App;
