# Agoric Dapp Starter: Agoric Basics

This is a basic Agoric Dapp that contains three smart contracts `postal-service`, `sell-concert-tickets`, and `swaparoo`, demonstrating different scenarios which can be implemented easily using Agoric SDK. There is also a UI for the `sell-concert-tickets` contract that a user can use to buy three different types of concert tickets and pay through a wallet extension in the browser. 
The following instructions provide a guide to setup an environment for trying `dapp-agoric-basics` on your local machine. You can also [try it in GitHub Codespaces](#instructions-to-run-dapp-agoric-basic-in-ghcs) without any local installations or downloads.

## Getting started

Make sure all the required dependencies are already installed (including [Node.js](https://nodejs.org/), [nvm](https://github.com/nvm-sh/nvm), [Docker](https://www.docker.com/), [Keplr](https://www.keplr.app/), and that your Node.js version is [supported](https://github.com/Agoric/agoric-sdk/tree/master#prerequisites) by running `nvm use 20` [substituting a later version as appropriate]. See [a tutorial here](https://docs.agoric.com/guides/getting-started/) on how to install these dependencies.). Here are the steps to run `dapp-agoric-basics`: 
1. Run `yarn install` in the `agoric-basics` directory, to install dependencies of the Dapp.
2. Run `yarn start:docker` to start the Agoric blockchain in the container.
3. Run `yarn docker:logs` to make sure blocks are being produced by viewing the Docker logs; once your logs resemble the following, stop the logs by pressing `ctrl+c`.
   ```
   demo-agd-1  | 2023-12-27T04:08:06.384Z block-manager: block 1003 begin
   demo-agd-1  | 2023-12-27T04:08:06.386Z block-manager: block 1003 commit
   demo-agd-1  | 2023-12-27T04:08:07.396Z block-manager: block 1004 begin
   demo-agd-1  | 2023-12-27T04:08:07.398Z block-manager: block 1004 commit
   demo-agd-1  | 2023-12-27T04:08:08.405Z block-manager: block 1005 begin
   demo-agd-1  | 2023-12-27T04:08:08.407Z block-manager: block 1005 commit
   ```
4. Run `yarn start:contract` to start the contracts.
5. Run `yarn start:ui` to start `sell-concert-tickets` contract UI.
6. Open a browser and navigate to [localhost:5173](http://localhost:5173) to interact with the contract via UI.

See a [more detailed tutorial](https://docs.agoric.com/guides/getting-started/tutorial-dapp-agoric-basics.html).

## Testing

To perform unit tests:
- Run `yarn test` in the root directory.

To perform end to end tests:
- Run `yarn test:e2e` in the root directory.

<a id="instructions-to-run-dapp-agoric-basic-in-ghcs"></a>
## Instructions to run `dapp-agoric-basic` in GitHub Codespaces

Here are the step-by-step instructions to run/work on `dapp-agoric-basic` in GitHub Codespaces:

1. Go to repo here: [https://github.com/Agoric/dapp-agoric-basics/](https://github.com/Agoric/dapp-agoric-basics/)
2. Click on the green **\<> Code** button:
   ![Green `<> Code` button](https://docs.github.com/assets/cb-13128/mw-1440/images/help/repository/code-button.webp)
3. Click on **Codespaces** tab and create a new Codespace. If you are already using Codespaces on current repo then click the **+** button on top right of the **Codespaces** tab to create a new one.
4. You should see a VS Code environment load in your browser followed by a setup. This should take a few minutes.
5. Run `yarn start:docker` followed by `yarn docker:logs` - kill it after you see `begin`/`commit`.
6. Run `yarn start:contract`.
7. Run `yarn start:ui` - a pop-up should appear at bottom right. Click **open in browser** if needed.
8. Dapp should be loaded in your browser.
9. Connect your Wallet and interact with Dapp as usual.

## Contributing
See [CONTRIBUTING](./CONTRIBUTING.md) for more on contributions.
