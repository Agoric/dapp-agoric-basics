import React, { useState } from 'react';

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
      cost += newNumTickets[section].numTickets * newNumTickets[section].pricePerTicket;
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
    <form onSubmit={(event) => event.preventDefault()}>
      {Object.entries(numTickets).map(([sectionName, sectionData]) => (
        <div key={sectionName} style={{ display: 'flex', alignItems: 'center' }}>
          <label htmlFor={sectionName} style={{ marginRight: '10px' }}>{sectionData.name}</label>
          <input
            type="number"
            name={sectionName}
            id={sectionName}
            value={sectionData.numTickets}
            onChange={handleInputChange}
          />
          <span style={{ marginLeft: '10px' }}>({sectionData.pricePerTicket} IST each)</span>
        </div>
      ))}

      <p>Total Cost: {totalCost} IST</p>
      <button type="button" onClick={handleMint} disabled={totalCost === 0}>
        MINT
      </button>
    </form>
  );
}

export default ConcertTicketForm;
