# BeraBundle Safe App

BeraBundle Safe App is a dedicated [Safe](https://safe.global/) app for bundling multiple token swaps into a single transaction on Berachain. The app streamlines the process of swapping multiple tokens, handling all the approvals and swap operations in a single batch for your Safe wallet to execute.

## Features

- **Multi-token Swaps**: Select multiple tokens and swap them all at once
- **Safe Integration**: All transactions are prepared for execution through your Safe's multisig
- **API-powered Quotes**: Uses reliable API for accurate price data and optimal swap routes
- **Simple Interface**: Clean, intuitive UI for selecting tokens and configuring swaps
- **Seamless Experience**: Fits perfectly within the Safe interface

## Getting Started

### Development

1. Clone the repository:
   ```
   git clone https://github.com/berabundle/SafeSwap.git
   cd SafeSwap
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. For production build:
   ```
   npm run build
   ```

5. Deploy to GitHub Pages:
   ```
   npm run deploy
   ```

### Usage as a Safe App

1. Access your Safe at [app.safe.global](https://app.safe.global)
2. Navigate to the Apps section
3. Click "Add custom app" 
4. Enter the app URL: `https://berabundle.github.io/SafeSwap`
5. Enter your API key when prompted
6. Select the tokens you want to swap
7. Choose your target token
8. Click "Prepare Safe Transaction"
9. Review and confirm the transaction in your Safe

## Project Structure

```
├── public/               # Public assets
├── src/                  # Source code
│   ├── components/       # React components
│   │   ├── ApiKeyInput.js  # API key input component
│   │   ├── SwapForm.js     # Swap form component
│   │   └── SwapForm.css    # Swap form styles
│   ├── services/         # Service classes
│   │   ├── BerabundlerService.js    # Berabundle contract service
│   │   ├── TokenBridgeService.js    # Token swap service
│   │   └── TokenMetadataService.js  # Token metadata service
│   ├── App.js            # Main application component
│   ├── App.css           # Main application styles
│   ├── config.js         # Application configuration
│   ├── index.js          # Application entry point
│   └── index.css         # Global styles
└── contracts/            # Smart contract files
    └── berabundle_swapbundler_v1.sol  # Swap bundler contract
```

## Requirements

- A [Safe](https://safe.global/) wallet deployed on Berachain
- API key for price data and swap routing

## How It Works

1. The app fetches your token balances from your Safe using the Safe SDK
2. When you select tokens to swap, the app generates approval and swap transactions
3. The API provides optimal swap routes and quotes
4. The app bundles all transactions together and sends them to your Safe for approval
5. After confirmation, all swaps are executed in a single transaction

## Technologies

- React 18
- ethers.js 5.7
- @safe-global/safe-apps-sdk 8.1
- @safe-global/safe-apps-react-sdk 4.7
- viem 1.21

## License

ISC