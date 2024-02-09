import { FC } from 'react';
import { MdEventSeat } from 'react-icons/md';

interface SeatProps {}

const Seat: FC<SeatProps> = () => {
  return (
    <td
      style={{
        backgroundColor: '#ffca8a', // Yellow background
        borderRadius: '5px',
        border: '1px solid #8f703a', // Solid border
        padding: '5px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <MdEventSeat style={{ color: '#8f703a' }} />
    </td>
  );
};

interface SeatingChartProps {}

const SeatingChart: FC<SeatingChartProps> = () => {
  return (
    <div
      style={{
        border: '1px solid #8f703a', // Chart border
        borderRadius: '15px',
        padding: '20px',
        backgroundColor: '#f2f0e8', // Chart background
      }}
    >
      <table>
        <tbody>
          <tr>
            <td>
              <Seat />
            </td>
            <td>
              <Seat />
            </td>
            <td>
              <Seat />
            </td>
            <th>Front Row</th>
          </tr>
          <tr>
            <td>
              <Seat />
            </td>
            <td>
              <Seat />
            </td>
            <td>
              <Seat />
            </td>
            <th>Middle Row</th>
          </tr>
          <tr>
            <td>
              <Seat />
            </td>
            <td>
              <Seat />
            </td>
            <td>
              <Seat />
            </td>
            <th>Last Row</th>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default SeatingChart;
