# Instructions to run `dapp-agoric-basic` in GHCS

Here are the step-by-step instructions to run/work on `dapp-agoric-basic` in github codespaces:

1. Go to repo here: [https://github.com/Agoric/dapp-agoric-basics/](https://github.com/Agoric/dapp-agoric-basics/)
2. Click on ![Green `<> Code` button](https://docs.github.com/assets/cb-13128/mw-1440/images/help/repository/code-button.webp)
3. Click on `Codespaces` tab and create a new Codespace. If you are already using Codespaces on current repo then click the "+" button on top right of the `Codespaces` tab to create a new one.
4. You should see a VSCode environment load in your browser followed by a setup. This should take a few minutes.
5. Once it's done do `yarn install` in the terminal.
6. Do `yarn start:docker` followed by `yarn docker:logs` - kill it after you see `begin`/`commit`.
7.  Do `yarn start:contract`.
8. Do `yarn start:ui` - a pop-up should appear in bottom right. Click open in browser if needed.
9. DApp should be load in your browser.
10. Connect your Wallet and interact with DApp as usual.