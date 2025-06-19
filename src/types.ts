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

export interface SwapBundle {
  targetToken: Token;
  totalValueUsd: number;
  estimatedOutput: number;
}