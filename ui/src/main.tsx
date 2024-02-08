import './installSesLockdown.ts';
import React from 'react';
import ReactDOM from 'react-dom/client';
import ConcertTicketForm from './components/ConcertTicketForm';

// import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConcertTicketForm />
  </React.StrictMode>,
);
