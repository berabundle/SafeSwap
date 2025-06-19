# SafeSwap

A Safe App for bundling multiple token swaps into a single transaction on Berachain.

## Overview

SafeSwap allows Safe multisig users to:
- Select multiple tokens from their Safe
- Bundle all swaps into one atomic transaction
- Save gas by executing everything at once
- Use OogaBooga's swap routing for optimal rates

## Features

- **Multi-token Selection**: Select any number of tokens with custom amounts
- **Real-time Pricing**: Live USD values from OogaBooga API
- **Single Transaction**: All swaps execute atomically - either all succeed or all fail
- **Safe Integration**: Built specifically for Gnosis Safe multisigs
- **Clean UI**: Simple, single-page interface with no popups or overlays

## Technical Stack

- **Frontend**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI)
- **Blockchain**: ethers.js v6
- **Safe Integration**: Safe Apps SDK
- **API**: OogaBooga for prices and swap routing

## Getting Started

### Prerequisites

- Node.js 16+
- OogaBooga API key (get from [oogabooga.io](https://oogabooga.io))
- A Safe multisig on Berachain

### Installation

```bash
# Clone the repository
git clone https://github.com/berabundle/SafeSwap.git
cd SafeSwap

# Install dependencies
npm install

# Start development server
npm start
```

### Deployment

```bash
# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy
```

The app will be available at: `https://berabundle.github.io/SafeSwap`

## Usage

1. **Open in Safe**: Navigate to your Safe Apps section and add the SafeSwap URL
2. **Enter API Key**: Input your OogaBooga API key (not stored anywhere)
3. **Select Tokens**: Choose tokens to swap and enter amounts
4. **Choose Output**: Select which token to receive
5. **Execute**: Review the quote and execute through Safe

## Architecture

```
src/
├── App.tsx                    # Main application component
├── components/
│   ├── TokenSelector.tsx      # Token selection with amounts
│   └── SwapForm.tsx          # Swap execution interface
├── services/
│   ├── tokenService.ts       # Token data fetching
│   └── SwapBundleService.ts  # Swap bundling logic
└── types.ts                  # TypeScript definitions
```

## How It Works

SafeSwap leverages Safe's native transaction bundling:
1. Fetches swap quotes from OogaBooga API in parallel
2. Creates ERC20 approval transactions for each token
3. Creates swap transactions using OogaBooga routers
4. Bundles all transactions (approvals + swaps)
5. Sends the bundle to Safe for multisig execution

All transactions execute atomically - if one fails, they all fail.

## API Integration

The app uses OogaBooga API for:
- **GET /v1/tokens** - Available tokens list
- **GET /v1/prices** - Current USD prices
- **POST /v1/swap** - Swap quotes and routing

All API calls require authentication via Bearer token.

## Security

- **API Keys**: Entered by users, never stored
- **Client-side**: All operations happen in the browser
- **Safe Integration**: All transactions go through Safe's approval process
- **No Backend**: Fully decentralized, no servers involved

## Development

```bash
# Run tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint

# Build
npm run build
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

- Report issues at [GitHub Issues](https://github.com/berabundle/SafeSwap/issues)
- OogaBooga API docs: [docs.oogabooga.io](https://docs.oogabooga.io)
- Safe Apps docs: [docs.safe.global](https://docs.safe.global)