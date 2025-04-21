# SafeSwap

SafeSwap is a Safe App that allows bundling multiple token swaps into a single transaction, reducing gas costs and providing atomic execution.

## Features

- Select multiple tokens to swap in a single transaction
- Choose target token for all swaps
- Automatic price and output estimation
- Bundled transaction execution through Safe
- Support for both ERC20 and native tokens

## Architecture

SafeSwap uses the following components:

1. **Berabundle_SwapBundler Contract**: A smart contract that bundles multiple operations (approvals and swaps) into a single atomic transaction.

2. **BerabundlerService**: A service that creates and manages swap operations, communicates with APIs, and prepares transactions for Safe execution.

3. **TokenSelector**: A component for selecting tokens to swap with balance display.

4. **SwapForm**: A component that manages the swap process, displaying estimated outputs and executing the bundled transaction.

## Setup

1. Clone the repository

```bash
git clone https://github.com/berabundle/SafeSwap.git
cd SafeSwap
```

2. Install dependencies

```bash
npm install
```

3. Start the development server

```bash
npm start
```

## Usage

1. Access the app through your Safe interface at https://app.safe.global
2. Select the tokens you want to swap by clicking on them in the token list
3. Enter the amount for each token
4. Choose your target token from the dropdown
5. Review the estimated output and swap details
6. Click "Execute Swap Bundle" to submit the transaction to your Safe for approval

## Integration with OogaBooga API

SafeSwap integrates with the OogaBooga API for price feeds and swap quotes. The API is used to:

- Get token prices for USD value display
- Generate swap quotes with optimal routing
- Create calldata for swap execution

## License

MIT