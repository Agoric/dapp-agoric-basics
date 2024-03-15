import { useImmer } from 'use-immer';
import { SwapHalf, Purse } from './SwapHalf';

const Swap = () => {
  const [purse, updatePurse] = useImmer<Purse>({
    Front: {
      give: 0,
      have: 3,
      want: 0,
    },
    Middle: {
      give: 0,
      have: 2,
      want: 0,
    },
    Last: {
      give: 0,
      have: 0,
      want: 0,
    },
  });

  // Whole Swap UI
  return (
    <div className="flex w-full flex-row justify-center">
      <div className="flex w-11/12 flex-row">
        <div className="card grid h-full flex-grow place-items-center rounded-box">
          <SwapHalf purse={purse} type={'give'} updatePurse={updatePurse} />
        </div>
        <div className="daisyui-divider lg:daisyui-divider-horizontal"></div>
        <div className="card grid h-full flex-grow place-items-center rounded-box">
          <SwapHalf purse={purse} type={'want'} updatePurse={updatePurse} />
        </div>
      </div>
    </div>
  );
};

export { Swap };
