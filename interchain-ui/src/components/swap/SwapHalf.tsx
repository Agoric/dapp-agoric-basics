import { Updater } from 'use-immer';

const ticketKinds = ['Front', 'Middle', 'Last'];
const available = 3;

export interface Purse {
  [key: string]: {
    give: number;
    have: number;
    want: number;
  };
}

type Type = 'give' | 'want';

const SwapHalf = ({
  purse,
  type,
  updatePurse,
}: {
  purse: Purse;
  type: Type;
  updatePurse: Updater<Purse>;
}) => {
  const handleRangeClick = (type: Type, kind: string, value: number) => {
    updatePurse(draft => {
      draft[kind][type] = value;
    });
  };

  return (
    <div>
      <SwapStats
        type={type}
        ticketKinds={ticketKinds}
        purse={purse}
        handleRangeClick={handleRangeClick}
      />
      {/* <div className="daisyui-divider"></div>
      <SwapCard
        kind="Front"
        type={type}
        purse={purse}
        handleRangeClick={handleRangeClick}
      />
      <div className="daisyui-divider"></div>
      <SwapCard
        type={type}
        kind="Middle"
        purse={purse}
        handleRangeClick={handleRangeClick}
      />
      <div className="daisyui-divider"></div>
      <SwapCard
        type={type}
        kind="Last"
        purse={purse}
        handleRangeClick={handleRangeClick}
      /> */}
    </div>
  );
};

const SwapStats = ({
  type,
  ticketKinds,
  purse,
  handleRangeClick,
}: {
  type: Type;
  ticketKinds: string[];
  purse: Purse;
  handleRangeClick: (type: Type, kind: string, value: number) => void;
}) => {
  return (
    <div className="daisyui-stats daisyui-stats-vertical shadow">
      {ticketKinds.map(kind => {
        return (
          <SwapStat
            type={type}
            kind={kind}
            purse={purse}
            handleRangeClick={handleRangeClick}
          />
        );
      })}
    </div>
  );
};

const SwapStat = ({
  type,
  kind,
  purse,
  handleRangeClick,
}: {
  type: Type;
  kind: string;
  purse: Purse;
  handleRangeClick: (type: Type, kind: string, value: number) => void;
}) => {
  const max = type === 'give' ? purse[kind].have : available - purse[kind].have;
  const textClass = type === 'give' ? 'text-primary' : 'text-secondary';
  const rangeClass =
    type === 'give' ? 'daisyui-range-primary' : 'daisyui-range-secondary';

  return (
    <div className="daisyui-stat">
      <div className="daisyui-stat-title">{kind} Row</div>
      <div className="daisyui-stat-actions">
        <input
          type="range"
          min={0}
          max={max}
          value={purse[kind][type]}
          className={`daisyui-range ${rangeClass}`}
          onChange={evt =>
            handleRangeClick(type, kind, Number(evt.target.value))
          }
        />
      </div>
      <div className={`daisyui-stat-value ${textClass}`}>
        {type === 'give' ? '-' : '+'} {purse[kind][type]}
      </div>
      <div className="daisyui-stat-desc">in purse: {purse[kind].have}</div>
    </div>
  );
};

const SwapCard = ({
  type,
  kind,
  purse,
  handleRangeClick,
}: {
  type: Type;
  kind: string;
  purse: Purse;
  handleRangeClick: (type: Type, kind: string, value: number) => void;
}) => {
  const ticketImgPath = 'src/assets/' + kind.toLowerCase() + 'Row.jpg';
  const max = type === 'give' ? purse[kind].have : available - purse[kind].have;
  const colorClass =
    type === 'give' ? 'daisyui-range-primary' : 'daisyui-range-secondary';

  return (
    // Give card
    <div className="daisyui-card bg-base-100 shadow-xl lg:daisyui-card-side">
      {/* card image */}
      <figure>
        <img src={ticketImgPath} alt={kind + ' Row'} />
      </figure>
      {/* card body */}
      <div className="daisyui-card-body">
        {/* card title */}
        <h2 className="daisyui-card-title">{kind} Row</h2>
        {/* ticket value selector */}
        <input
          type="range"
          min={0}
          max={max}
          value={purse[kind][type]}
          className={`daisyui-range ${colorClass}`}
          onChange={evt =>
            handleRangeClick(type, kind, Number(evt.target.value))
          }
        />
      </div>
    </div>
  );
};

export { SwapHalf };
