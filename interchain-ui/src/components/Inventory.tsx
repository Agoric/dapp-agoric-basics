import { ConnectWalletButton, useAgoric } from '@agoric/react-components';
import { stringifyAmountValue } from '@agoric/ui-components';
import { usePurse } from '../hooks/usePurse';
import type { CopyBag } from '../types';

const Inventory = () => {
  const istPurse = usePurse('IST');
  const ticketsPurse = usePurse('Ticket');
  const { walletConnection } = useAgoric();

  return (
    <div className="daisyui-card w-96 bg-base-100 shadow-xl">
      <div className="daisyui-card-body items-center text-center">
        <h2 className="daisyui-card-title">My Wallet</h2>
        <div className="daisyui-card-actions">
          <div>
            <ConnectWalletButton className="daisyui-btn daisyui-btn-outline daisyui-btn-primary" />
            {walletConnection && (
              <div>
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
                    <ul>
                      {(
                        ticketsPurse.currentAmount.value as CopyBag
                      ).payload.map(([name, number]) => (
                        <li key={name}>
                          {String(number)} {name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    'None'
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { Inventory };
