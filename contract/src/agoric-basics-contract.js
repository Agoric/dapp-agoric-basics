// @ts-check
import { Far } from '@endo/far';

const greet = who => `Hello, ${who}!`;

export const start = () => {
  return {
    publicFacet: Far('Hello', { greet }),
  };
};
