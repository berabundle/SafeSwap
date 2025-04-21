# OogaBooga API Documentation

## Price API Reference

### Endpoints

1. **GET /v1/prices**
   - Purpose: Retrieve computed prices for whitelisted tokens
   - Default Currency: USD
   - Note: Native token BERA is represented by zero address

2. **GET /v1/tokens**
   - Purpose: Retrieve list of tokens available for trading on Ooga Booga's Smart Order Routing

### Authentication
- Requires a Bearer token in the Authorization header

### Response Format Examples

**Prices Endpoint Response:**
```json
[
  {
    "address": "0x6969696969696969696969696969696969696969",
    "price": 1
  }
]
```

**Tokens Endpoint Response:**
```json
[
  {
    "address": "0xFCBD14DC51f0A4d49d5E53C2E0950e0bC26d0Dce",
    "name": "Honey",
    "symbol": "HONEY",
    "decimals": 18,
    "tokenURI": "https://artio-static-asset-public.s3.ap-southeast-1.amazonaws.com/assets/honey.png"
  }
]
```

## Swap API Reference

### Endpoints

1. **POST /v1/swap**
   - Purpose: Get swap quotes and execute swaps
   - Authentication: Requires a Bearer token in the Authorization header
   - Request Body Parameters:
     - `chainId` (number): Chain ID for the swap (80085 for Berachain testnet)
     - `tokenIn` (string): Address of the input token (use "native" for BERA)
     - `tokenOut` (string): Address of the output token
     - `amount` (string): Amount of tokenIn in wei (as a string)
     - `slippage` (number): Slippage tolerance percentage (e.g., 0.5 for 0.5%)
     - `recipient` (string, optional): Address to receive the output tokens

   - Request Body Example:
     ```json
     {
       "chainId": 80085,
       "tokenIn": "0x6969696969696969696969696969696969696969",
       "tokenOut": "0x4200000000000000000000000000000000000001",
       "amount": "1000000000000000000",
       "slippage": 0.5
     }
     ```

### Response Format

**Swap Endpoint Response:**
```json
{
  "routerAddress": "0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3",
  "calldata": "0x12345...",
  "minOutputAmount": "950000000000000000",
  "outputAmount": "1000000000000000000",
  "priceImpact": 0.1
}
```

### Response Fields

- `routerAddress` (string): The address of the router to execute the swap through
- `calldata` (string): The encoded function call data to be passed to the router
- `minOutputAmount` (string): Minimum amount of output tokens to receive, accounting for slippage
- `outputAmount` (string): Expected amount of output tokens before slippage
- `priceImpact` (number): Estimated price impact as a percentage

### Error Handling

The API returns standard HTTP status codes:
- 400: Bad Request - Invalid parameters
- 401: Unauthorized - Missing or invalid API key
- 500: Internal Server Error

### Rate Limits

- Free tier: 100 requests per minute
- Premium tier: 1000 requests per minute

## Usage in BerabundlerService

In the SafeSwap application, the OogaBooga API is used for:
1. Fetching token prices and details
2. Getting swap quotes for bundled swaps
3. Generating transaction data for the Berabundle_SwapBundler contract

API keys should be stored securely and not committed to the repository.