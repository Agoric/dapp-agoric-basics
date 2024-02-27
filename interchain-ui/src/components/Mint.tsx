import { useState } from 'react';
import { Range } from 'react-daisyui';
import { AmountMath } from '@agoric/ertp';
import { makeCopyBag } from '@endo/patterns';
import { AgoricWalletConnection, useAgoric } from '@agoric/react-components';
import { useContractStore } from '../store/contract';
import '@interchain-ui/react/styles';

const IST_UNIT = 1_000_000n;

const makeOffer = (
  wallet: AgoricWalletConnection,
  ticketKind: string,
  ticketValue: bigint,
  giveValue: bigint,
) => {
  const { instance, brands } = useContractStore.getState();
  if (!instance) throw Error('no contract instance');
  if (!(brands && brands.IST && brands.Ticket))
    throw Error('brands not available');

  const choices: [string, bigint][] = [
    [ticketKind.toLowerCase() + 'Row', ticketValue],
  ];
  const choiceBag = makeCopyBag(choices);
  const ticketAmount = AmountMath.make(brands.Ticket, choiceBag);
  const want = { Tickets: ticketAmount };
  const give = { Price: { brand: brands.IST, value: giveValue * IST_UNIT } };

  wallet?.makeOffer(
    {
      source: 'contract',
      instance,
      publicInvitationMaker: 'makeTradeInvitation',
    },
    { give, want },
    undefined,
    (update: { status: string; data?: unknown }) => {
      if (update.status === 'error') {
        alert(`Offer error: ${update.data}`);
      }
      if (update.status === 'accepted') {
        alert('Offer accepted');
      }
      if (update.status === 'refunded') {
        alert('Offer rejected');
      }
    },
  );
};

const MintConcertTicket = ({
  kind,
  price,
  available,
}: {
  kind: string;
  price: number;
  available: number;
}) => {
  const [tickets, setTickets] = useState(1);
  const { walletConnection } = useAgoric();

  return (
    <div>
      {/* Mint card */}
      <div className="daisyui-card bg-base-100 shadow-xl lg:daisyui-card-side">
        {/* card image */}
        <figure>
          <img
            src={'src/assets/' + kind.toLowerCase() + 'Row.jpg'}
            alt={kind + ' Row'}
          />
        </figure>
        {/* card body */}
        <div className="daisyui-card-body">
          {/* card title */}
          <h2 className="daisyui-card-title">{kind} Row</h2>
          {/* card description */}
          <p>{kind} row concert ticket</p>
          {/* ticket value selector */}
          <Range
            defaultValue={tickets}
            min={1}
            max={available}
            onChange={evt => setTickets(Number(evt.target.value))}
          />
          {/* card action */}
          <div className="daisyui-card-actions flex">
            {/* ticket price */}
            <div className="daisyui-stats shadow">
              <div className="daisyui-stat">
                <div className="daisyui-stat-figure text-primary">
                  <img src="src/assets/IST.png" />
                </div>
                <div className="daisyui-stat-title">Total Price</div>
                <div className="daisyui-stat-value text-secondary">
                  {tickets * price} IST
                </div>
                <div className="daisyui-stat-desc">{tickets} tickets</div>
              </div>
            </div>
            {/* divider */}
            <div className="daisyui-divider lg:daisyui-divider-horizontal"></div>
            {/* mint button */}
            <div className="">
              <button
                className="daisyui-btn daisyui-btn-primary"
                onClick={() => {
                  if (walletConnection) {
                    makeOffer(
                      walletConnection,
                      kind,
                      BigInt(tickets),
                      BigInt(tickets * price),
                    );
                  } else {
                    alert('Please connect your wallet first');
                    return;
                  }
                }}
              >
                Mint
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Mint = () => {
  return (
    <div>
      <MintConcertTicket kind="Front" available={3} price={3} />
      <div className="daisyui-divider"></div>
      <MintConcertTicket kind="Middle" available={3} price={2} />
      <div className="daisyui-divider"></div>
      <MintConcertTicket kind="Last" available={3} price={1} />
    </div>
  );
};

export { Mint };
