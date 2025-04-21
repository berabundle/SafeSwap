export interface Token {
  name: string;
  symbol: string;
  address: string;
  decimals: number;
  logoURI?: string;
  chainId: number;
  balance?: string;
  priceUsd?: number;
  isNative?: boolean;
}

export interface TokenAmount {
  token: Token;
  amount: string;
  isMax: boolean;
}

export interface SwapOperation {
  operationType: number; // 1 = approve, 2 = swap
  target: string;       // Router address
  data: string;         // Encoded call data
  value: string;        // ETH value to send
  tokenAddress: string; // Input token address
  tokenAmount: string;  // Input token amount
  outputToken: string;  // Output token address
  minOutputAmount: string; // Minimum expected output
}

export interface SwapBundle {
  operations: SwapOperation[];
  targetToken: Token;
  totalValueUsd: number;
  estimatedOutput: number;
}