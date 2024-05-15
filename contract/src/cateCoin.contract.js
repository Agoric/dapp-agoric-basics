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
  const cateAssetKind = zcf.getAssetKind(cateBrand);
  console.log('AssetKind for Cate Coin is : ', cateAssetKind);

  const createInitialCoins = (myPurse, amount) => {
    if (isInitialized === 1) return 'Fail - already initialized';

    console.log('creating first coins');
    isInitialized = 1;
    creatorPurse = myPurse;

    const cateAmount = AmountMath.make(cateBrand, amount);
    if (AmountMath.isGTE(cateAmount, maxSupply))
      return 'fail - amount exceeds maxSupply';
    const catePayment = cateMint.mintPayment(cateAmount);

    creatorPurse.deposit(catePayment);
    currSupply = amount;

    const currentAmount = creatorPurse.getCurrentAmount();
    console.log(
      'Current Amount in my purse after deposit is : ',
      currentAmount,
    );
    return 'success';
  };
  const mintCateCoins = (myPurse, amount) => {
    if (creatorPurse !== myPurse)
      return 'Fail - Only creator can mint new tokens';
    if (currSupply + amount > maxSupply) return 'Fail - reached max supply';

    const cateAmount = AmountMath.make(cateBrand, amount);
    const catePayment = cateMint.mintPayment(cateAmount);
    creatorPurse.deposit(catePayment);
    currSupply += amount;

    return 'success';
  };
  const transferCateCoins = (fromPurse, toPurse, amount) => {
    const cateAmount = AmountMath.make(cateBrand, amount);
    if (AmountMath.isGTE(fromPurse.getCurrentAmount(), cateAmount)) {
      const catePayment = fromPurse.withdraw(cateAmount);
      toPurse.deposit(catePayment);
      return 'success';
    }
    return 'fail - not enough funds in sender account';
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

  // // Step 1: Get the address of the inviter
  // //Check if this is the first call to this instance of the contract
  // //Get the address of the party.
  // const inviterAddress = zcf.state.get('inviterAddress');
  // if (inviterAddress === undefined) {
  //   zcf.state.inviterAddress = zcf.getAddress();
  //   inviterAddress = zcf.state.get('inviterAddress');

  // }

  // console.log("The address of zoe I got is : ${inviterAddress}");
  // return ;

  // const { inventory } = zcf.getTerms();

  // const inventoryValues = Object.values(inventory);

  //   const paymentAmount = cateIssuer.getAmountOf(catePayment);

  //   //TODO: check - Not sure if we can burn partial amount from a payment
  //   const amountToBurn = AmountMath.make(cateBrand, 5n);
  //   const burntAmount = cateIssuer.burn(catePayment, amountToBurn);
  //   console.log(burntAmount);

  //   const catePurse = cateIssuer.makeEmptyPurse();
  //   const currentAmount = catePurse.getCurrentAmount();
  //   console.log("Current Amount in my purse is : ",currentAmount);
  //   catePurse.deposit(catePayment);
  //   currentAmount = catePurse.getCurrentAmount();
  //   console.log("Current Amount in my purse after deposit is : ",currentAmount);

  //   const cate3 = AmountMath.make(brand, 30n);
  //   const withdrawalPayment = purse.withdraw(cate3);
};

harden(start);
