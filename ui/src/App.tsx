import { ContractProvider } from './providers/Contract';
import { AgoricProvider } from '@agoric/react-components';
import { Navbar } from './components/Navbar';
import { Tabs } from './components/Tabs';
import { wallets } from 'cosmos-kit';
import { ThemeProvider, useTheme } from '@interchain-ui/react';
import '@agoric/react-components/dist/style.css';

function App() {
  const { themeClass } = useTheme();
  let REST_HOSTNAME = 'http://localhost:1317';
  let RPC_HOSTNAME = 'http://localhost:26657';

  const codeSpaceHostName = import.meta.env.VITE_HOSTNAME;
  const codeSpaceDomain = import.meta.env.VITE_GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;

  if (codeSpaceHostName) {
    REST_HOSTNAME = `https://${codeSpaceHostName}-1317.${codeSpaceDomain}`;
    RPC_HOSTNAME = `https://${codeSpaceHostName}-26657.${codeSpaceDomain}`;
  }

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
                rest: [REST_HOSTNAME],
                rpc: [RPC_HOSTNAME],
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
