import React, { useState } from 'react';
import SeatingChart from './SeatingChart.tsx';

interface TicketSection {
  name: string;
  pricePerTicket: number;
  numTickets: number;
}

interface TicketSelection {
  [sectionName: string]: TicketSection;
}

function ConcertTicketForm() {
  const [numTickets, setNumTickets] = useState<TicketSelection>({
    frontRow: { name: 'Front Row', pricePerTicket: 3, numTickets: 0 },
    middleRow: { name: 'Middle Row', pricePerTicket: 2, numTickets: 0 },
    lastRow: { name: 'Last Row', pricePerTicket: 1, numTickets: 0 },
  });

  const [totalCost, setTotalCost] = useState(0);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const newNumTickets = { ...numTickets };
    newNumTickets[name].numTickets = parseInt(value, 10);
    setNumTickets(newNumTickets);

    // Calculate and update total cost immediately
    const newTotalCost = calculateTotalCost(newNumTickets);
    setTotalCost(newTotalCost);
  };

  const calculateTotalCost = (newNumTickets: TicketSelection) => {
    let cost = 0;
    for (const section in newNumTickets) {
      cost +=
        newNumTickets[section].numTickets *
        newNumTickets[section].pricePerTicket;
    }
    return cost;
  };

  // Function to simulate minting functionality (replace with your actual implementation)
  const handleMint = () => {
    console.log('Minting tickets:', numTickets, 'Total cost:', totalCost);
    // Replace with your actual minting logic here (e.g., API call, web3 interaction)
    // You might need additional state or props depending on your specific implementation
  };

  return (
    <form
      onSubmit={event => event.preventDefault()}
      style={{
        borderRadius: 8,
        backgroundColor: '#ddd',
        padding: '20px',
        margin: '20px auto',
        maxWidth: 500,
        border: '1px solid #000',
      }}
    >
      <h2>Concert tickets available:</h2>
      <div style={{ float: 'right', margin: '1em' }}>
        <SeatingChart />
      </div>

      {Object.entries(numTickets).map(([sectionName, sectionData]) => (
        <div key={sectionName}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr' }}>
            <label htmlFor={sectionName}>
              {sectionData.name} ({sectionData.pricePerTicket} IST each):
            </label>
            <input
              type="number"
              name={sectionName}
              id={sectionName}
              value={sectionData.numTickets}
              onChange={handleInputChange}
              style={{
                backgroundColor: '#ff0',
                border: '1px solid #ccc',
                padding: '5px',
                borderRadius: '5px',
                width: '80px',
              }}
            />
          </div>
        </div>
      ))}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          marginTop: '20px',
        }}
      >
        <label htmlFor="totalCost">Total Cost:</label>
        <input
          type="text"
          name="totalCost"
          id="totalCost"
          value={totalCost}
          readOnly
          style={{
            backgroundColor: '#ff0',
            border: '1px solid #ccc',
            padding: '5px',
            borderRadius: '5px',
            width: '80px',
          }}
        />
      </div>

      {/* <button type="button" onClick={handleMint} disabled={totalCost === 0}>MINT</button> */}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <span></span>
        <button
          type="button"
          onClick={handleMint}
          disabled={totalCost === 0}
          style={{ margin: '10px auto 0 0' }}
        >
          MINT
        </button>
      </div>
    </form>
  );
}

export default ConcertTicketForm;
