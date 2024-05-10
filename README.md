# Agoric Dapp Starter: Agoric Basics

This is a basic Agoric Dapp that contains three smart contracts `postal-service`, `sell-concert-tickets`, and `swaparoo` demonstrating different scenarios which can be implemented easily using Agoric SDK. There is also a UI for `sell-concert-tickets` contract that a user can use to buy three different types of concert tickets and pay through a wallet extension in the browser. 

## Getting started

See [Your First Agoric Dapp](https://docs.agoric.com/guides/getting-started/) tutorial.

## Contributing: Development, Testing

The UI is a React app started with the [vite](https://vitejs.dev/) `react-ts` template.
On top of that, we add

- Watching [blockchain state queries](https://docs.agoric.com/guides/getting-started/contract-rpc.html#querying-vstorage)
- [Signing and sending offers](https://docs.agoric.com/guides/getting-started/contract-rpc.html#signing-and-broadcasting-offers)

See [CONTRIBUTING](./CONTRIBUTING.md) for more on testing.
