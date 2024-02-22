import { Box, NftMint } from '@interchain-ui/react';
import { ThemeProvider, useTheme } from '@interchain-ui/react';
import '@interchain-ui/react/styles';

const MintConcertTicket = ({
  kind,
  price,
}: {
  kind: string;
  price: number;
}) => {
  return (
    <div className="card">
      <Box>
        <NftMint
          tag="NOW LIVE"
          title="Mint"
          name={kind + ' Row'}
          description={kind + ' row concert ticket'}
          quantity={3}
          royalties={0}
          minted={0}
          available={100}
          priceDisplayAmount={price}
          limited={3}
          tokenName="IST"
          imgSrc="src/assets/react.svg"
          pricePerToken={price}
          onMint={() => {
            console.log('onMint');
          }}
          onChange={(value: number) => {
            console.log('onChange', value);
          }}
        />
      </Box>
    </div>
  );
};

const Mint = () => {
  const { themeClass } = useTheme();

  return (
    <>
      <ThemeProvider>
        <div className={themeClass}>
          <MintConcertTicket kind="Front" price={3} />
          <MintConcertTicket kind="Middle" price={2} />
          <MintConcertTicket kind="Last" price={1} />
        </div>
      </ThemeProvider>
    </>
  );
};

export { Mint };
