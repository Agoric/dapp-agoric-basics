# Agoric Dapp Starter: Agoric Basics

This is a basic Agoric Dapp that contains three smart contracts `postal-service`, `sell-concert-tickets`, and `swaparoo` demonstrating different scenarios which can be implemented easily using Agoric SDK. There is also a UI for `sell-concert-tickets` contract that a user can use to buy three different types of concert tickets and pay through a wallet extension in the browser. 

## Getting started

Make sure all the required dependecies are already installed (including node, nvm, docker, Keplr, and that your node version is set to `18.x.x` by running `nvm use 18.20.2`. See [a tutorial here](https://docs.agoric.com/guides/getting-started/) on how to install these dependecies.). Here are the steps to run `dapp-agoric-basics`: 
- run `yarn install` in the `agoric-basics` directory, to install dependencies of the Dapp.
- run `yarn start:docker` to start Agoric blockchain from the container.
- run `yarn docker:logs` to to make sure blocks are being produced by viewing the Docker logs; once your logs resemble the following, stop the logs by pressing `ctrl+c`.
```
demo-agd-1  | 2023-12-27T04:08:06.384Z block-manager: block 1003 begin
demo-agd-1  | 2023-12-27T04:08:06.386Z block-manager: block 1003 commit
demo-agd-1  | 2023-12-27T04:08:07.396Z block-manager: block 1004 begin
demo-agd-1  | 2023-12-27T04:08:07.398Z block-manager: block 1004 commit
demo-agd-1  | 2023-12-27T04:08:08.405Z block-manager: block 1005 begin
demo-agd-1  | 2023-12-27T04:08:08.407Z block-manager: block 1005 commit
```
- run `yarn start:contract` to start the contracts.
- run `yarn start:ui` to start `sell-concert-tickets` contract UI. You will need `vite` for UI to start properly. You can install `vite` by running `yarn add vite`.
- open a browser and navigate to `localhost:5173` to interact with the contract via UI.

To follow more detailed tutorial, go [here](https://docs.agoric.com/guides/getting-started/tutorial-dapp-agoric-basics.html).

## Testing

To perform unit tests:
-run the command `yarn test` in the root directory.
To perform end to end test
-run the command `yarn test:e2e` in the root directory.

## Contributing
See [CONTRIBUTING](./CONTRIBUTING.md) for more on contributions.
