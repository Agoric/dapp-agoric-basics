import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { Far } from '@endo/far';

import '@agoric/zoe/exported.js';

export const start = async zcf => {
  // Step 0: get an issuer kit
  const {
    issuer: cateIssuer,
    mint: cateMint,
    brand: cateBrand,
  } = makeIssuerKit('cateCoin');
  let currSupply = AmountMath.make(cateBrand, 0n);
  const maxSupply = AmountMath.make(cateBrand, 1000_000n);
  let creatorPurse;
  let isInitialized = 0;

  const getIssuer = () => cateIssuer;
  console.log('Name of the contract : ', zcf.name);

  const createInitialCoins = (myPurse, amount) => {
    try {
      if (isInitialized === 1) {
        throw new Error('Fail - already initialized');
      }

      console.log('creating first coins');
      isInitialized = 1;
      creatorPurse = myPurse;

      const cateAmount = AmountMath.make(cateBrand, amount);
      if (AmountMath.isGTE(cateAmount, maxSupply)) {
        throw new Error('Fail - amount exceeds maxSupply');
      }

      const catePayment = cateMint.mintPayment(cateAmount);
      creatorPurse.deposit(catePayment);
      currSupply = amount;

      const currentAmount = creatorPurse.getCurrentAmount();
      console.log(
        'Current Amount in my purse after deposit is : ',
        currentAmount,
      );
      return 'success';
    } catch (error) {
      console.error('Error in createInitialCoins:', error);
      return error.message;
    }
  };

  const mintCateCoins = (myPurse, amount) => {
    try {
      if (creatorPurse !== myPurse) {
        throw new Error('Fail - Only creator can mint new tokens');
      }
      if (currSupply + amount > maxSupply) {
        throw new Error('Fail - reached max supply');
      }

      const cateAmount = AmountMath.make(cateBrand, amount);
      const catePayment = cateMint.mintPayment(cateAmount);
      creatorPurse.deposit(catePayment);
      currSupply += amount;

      return 'success';
    } catch (error) {
      console.error('Error in mintCateCoins:', error);
      return error.message;
    }
  };

  const transferCateCoins = (fromPurse, toPurse, amount) => {
    try {
      const cateAmount = AmountMath.make(cateBrand, amount);
      if (!AmountMath.isGTE(fromPurse.getCurrentAmount(), cateAmount)) {
        throw new Error('Fail - not enough funds in sender account');
      }

      const catePayment = fromPurse.withdraw(cateAmount);
      toPurse.deposit(catePayment);
      return 'success';
    } catch (error) {
      console.error('Error in transferCateCoins:', error);
      return error.message;
    }
  };

  return {
    creatorFacet: Far('Creator Facet', {
      mintCateCoins,
      transferCateCoins,
      getIssuer,
      createInitialCoins,
    }),
    publicFacet: Far('Public Facet', { transferCateCoins }),
  };
};

harden(start);
