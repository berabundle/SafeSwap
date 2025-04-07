# BeraBundle Safe App

BeraBundle Safe App is a dedicated Safe app for bundling multiple token swaps into a single transaction on Berachain. The app streamlines the process of swapping multiple tokens, handling all the approvals and swap operations in a single batch for your Safe wallet to execute.

## Features

- **Multi-token Swaps**: Select multiple tokens and swap them all at once
- **Safe Integration**: All transactions are prepared for execution through your Safe's multisig
- **API-powered Quotes**: Uses OogaBooga API for accurate price data and optimal swap routes
- **Simple Interface**: Clean, intuitive UI for selecting tokens and configuring swaps
- **Seamless Experience**: Fits perfectly within the Safe interface

## Getting Started

### Development

1. Clone the repository:
   ```
   git clone https://github.com/your-username/berabundle-safe-app.git
   cd berabundle-safe-app
   ```

2. Install dependencies:
   ```
   npm install
   cd reactui
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

### Usage as a Safe App

1. Access your Safe at [app.safe.global](https://app.safe.global)
2. Navigate to the Apps section
3. Click "Add custom app" 
4. Enter the app URL (where you've deployed this app)
5. Enter your OogaBooga API key when prompted
6. Select the tokens you want to swap
7. Choose your target token
8. Click "Prepare Safe Transaction"
9. Review and confirm the transaction in your Safe

## Requirements

- A [Safe](https://safe.global/) wallet deployed on Berachain
- OogaBooga API key for price data and swap routing

## How It Works

1. The app fetches your token balances from your Safe using the Safe SDK
2. When you select tokens to swap, the app generates approval and swap transactions
3. The OogaBooga API provides optimal swap routes and quotes
4. The app bundles all transactions together and sends them to your Safe for approval
5. After confirmation, all swaps are executed in a single transaction

## Development

Built with:
- React
- ethers.js
- Safe Apps SDK

## License

ISC