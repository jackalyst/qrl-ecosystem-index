---
title: "Getting Started on QRL 2.0"
description: "Run a QRL 2.0 Testnet V2 node, create and fund a wallet, deploy a smart contract, and connect a dApp."
resource_groups:
  infrastructure:
    title: "Node and RPC infrastructure"
    description: "Community-listed infrastructure that supports the QRL 2.0 testnet."
  wallets:
    title: "Choose a testnet wallet"
    description: "Active wallet projects in the index that declare QRL 2.0 testnet support."
  tooling:
    title: "Developer tooling"
    description: "Active tools and libraries that can help with the next stage of a QRL application."
  explorers:
    title: "Check it in an explorer"
    description: "Active explorers in the index that declare QRL 2.0 testnet support."
  dapps:
    title: "Explore testnet dApps"
    description: "Active decentralized applications with testnet deployments listed in the index."
steps:
  - number: "01"
    id: "run-a-node"
    kicker: "Node"
    title: "Run a QRL 2.0 Testnet V2 node."
    summary: >
      Build and start the `gqrl` execution client and the Qrysm consensus client.
      Use the maintained guide for your operating system so network files,
      bootstrap nodes, and launch flags stay current.
    completion: "Both clients remain running and the local JSON-RPC endpoint responds."
    platform_guides:
      - name: "Linux"
        install_url: "https://test-zond.theqrl.org/testnet/install/linux"
        run_url: "https://test-zond.theqrl.org/testnet/running/linux"
      - name: "macOS"
        install_url: "https://test-zond.theqrl.org/testnet/install/mac"
        run_url: "https://test-zond.theqrl.org/testnet/running/mac"
      - name: "Windows"
        install_url: "https://test-zond.theqrl.org/testnet/install/windows"
        run_url: "https://test-zond.theqrl.org/testnet/running/windows"
    ecosystem_groups:
      - "infrastructure"
  - number: "02"
    id: "verify-sync"
    kicker: "Sync"
    title: "Verify the node is ready."
    summary: >
      Query the execution client before relying on it. The official checks cover
      the current block height, synchronization progress, and connected peers.
    completion: "The block height advances, `qrl_syncing` returns `false`, and the peer count is greater than zero."
    links:
      - label: "Check node status"
        url: "https://test-zond.theqrl.org/testnet/usage/checking-status"
        description: "Run the maintained JSON-RPC health checks."
  - number: "03"
    id: "create-a-wallet"
    kicker: "Wallet"
    title: "Create and secure a wallet."
    summary: >
      Create a fresh Testnet V2 account using a compatible wallet. Record the
      recovery material offline, verify it before receiving funds, and never
      paste it into a website or support conversation.
    completion: "You have a testnet address and have verified that its recovery material is safely backed up."
    note: "Wallets are independent ecosystem projects. Check each listing's status, platform, source, and documentation before use."
    links:
      - label: "Official Web3 wallet guide"
        url: "https://test-zond.theqrl.org/testnet/usage/web3-wallet"
        description: "Follow the QRL-maintained browser-extension setup."
    ecosystem_groups:
      - "wallets"
  - number: "04"
    id: "get-test-qrl"
    kicker: "Test funds"
    title: "Fund the wallet with test QRL."
    summary: >
      Request test QRL through the current community channel, then confirm the
      balance in your wallet or against your node before attempting a deployment.
    completion: "Your testnet wallet shows enough test QRL to pay deployment gas."
    note: "Test QRL exists only for network testing and has no monetary value."
    links:
      - label: "Get test QRL"
        url: "https://test-zond.theqrl.org/testnet/usage/getting-zond"
        description: "Use the current QRL Testnet V2 acquisition instructions."
  - number: "05"
    id: "deploy-a-contract"
    kicker: "Contract"
    title: "Compile and deploy a smart contract."
    summary: >
      Follow the maintained example repository to compile a simple contract and
      deploy it through your funded wallet. Confirm the example's current
      prerequisites and network endpoint before signing.
    completion: "The deployment transaction succeeds and returns a contract address and receipt."
    links:
      - label: "Deploy the contract example"
        url: "https://test-zond.theqrl.org/testnet/usage/contract-example"
        description: "Open the QRL-maintained contract walkthrough and source."
    ecosystem_groups:
      - "tooling"
  - number: "06"
    id: "verify-and-build"
    kicker: "dApp"
    title: "Verify the deployment and connect an interface."
    summary: >
      Look up the transaction and contract, then use the maintained dApp example
      to connect a wallet, read contract state, and submit a signed interaction.
    completion: "You can find the deployment on the testnet and complete a wallet-approved contract interaction."
    links:
      - label: "Build the dApp example"
        url: "https://test-zond.theqrl.org/testnet/usage/dapp-example"
        description: "Continue from the contract into a working interface."
    ecosystem_groups:
      - "explorers"
      - "dapps"
---
