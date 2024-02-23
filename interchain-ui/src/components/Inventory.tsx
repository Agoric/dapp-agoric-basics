import { ConnectWalletButton, useAgoric } from '@agoric/react-components';
import { stringifyAmountValue } from '@agoric/ui-components';
import { usePurse } from '../hooks/usePurse';
import type { CopyBag } from '../types';

const Inventory = () => {
  const istPurse = usePurse('IST');
  const ticketsPurse = usePurse('Ticket');
  const { walletConnection } = useAgoric();

  return (
    <div className="m-16 align-middle">
      <h3 className="text-center">My Wallet</h3>
      <div>
        <ConnectWalletButton className="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-700" />
        {walletConnection && (
          <div style={{ textAlign: 'left' }}>
            <div>
              <b>IST: </b>
              {istPurse ? (
                stringifyAmountValue(
                  istPurse.currentAmount,
                  istPurse.displayInfo.assetKind,
                  istPurse.displayInfo.decimalPlaces,
                )
              ) : (
                <i>Fetching balance...</i>
              )}
            </div>
            <div>
              <b>Tickets: </b>
              {ticketsPurse ? (
                <ul style={{ marginTop: 0, textAlign: 'left' }}>
                  {(ticketsPurse.currentAmount.value as CopyBag).payload.map(
                    ([name, number]) => (
                      <li key={name}>
                        {String(number)} {name}
                      </li>
                    ),
                  )}
                </ul>
              ) : (
                'None'
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { Inventory };
