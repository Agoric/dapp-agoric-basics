import { useState } from 'react';
import { Box, NftMint } from '@interchain-ui/react';
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
  const [tickets, setTickets] = useState(0);
  const { walletConnection } = useAgoric();

  return (
    <div>
      {/* new */}
      <div className="daisyui-card bg-base-100 shadow-xl lg:daisyui-card-side">
        <figure>
          <img
            src={'src/assets/' + kind.toLowerCase() + 'Row.jpg'}
            alt={kind + ' Row'}
          />
        </figure>
        <div className="daisyui-card-body">
          <h2 className="daisyui-card-title">{kind} Row</h2>
          <p>{kind} row concert ticket</p>
          <Range defaultValue={1} min={1} max={3} size="lg" />
          <div className="daisyui-card-actions justify-end">
            <button className="daisyui-btn daisyui-btn-primary">Mint</button>
          </div>
        </div>
      </div>
      {/* old */}
      <div>
        <Box>
          <NftMint
            tag="NOW LIVE"
            title="Mint"
            name={kind + ' Row'}
            description={kind + ' row concert ticket'}
            defaultAmount={tickets}
            quantity={3}
            royalties={0}
            minted={0}
            available={available}
            priceDisplayAmount={price}
            limited={3}
            tokenName="IST"
            imgSrc={'src/assets/' + kind.toLowerCase() + 'Row.jpg'}
            pricePerToken={price}
            onMint={() => {
              console.log('filterme onMint tickets=', tickets);
              if (tickets === 0) {
                alert('no need to mint 0 ticket');
                return;
              }
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
            onChange={(value: number) => {
              setTickets(value);
              console.log('filterme onChange tickets=', tickets);
            }}
          />
        </Box>
      </div>
    </div>
  );
};

const Mint = () => {
  return (
    <div>
      <MintConcertTicket kind="Front" available={3} price={3} />
      <MintConcertTicket kind="Middle" available={3} price={2} />
      <MintConcertTicket kind="Last" available={3} price={1} />
    </div>
  );
};

export { Mint };
