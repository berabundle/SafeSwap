/**
 * Token Service - Handles token data fetching from OogaBooga API
 * 
 * This service manages:
 * - Fetching available tokens from OogaBooga API
 * - Querying on-chain token balances
 * - Fetching current token prices in USD
 */

import { ethers } from 'ethers';
import { Token } from '../types';

const erc20Abi = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

/**
 * Fetches list of available tokens from OogaBooga API
 * @param apiKey - OogaBooga API key for authentication
 * @returns Promise containing array of Token objects
 */
export const fetchTokenList = async (apiKey: string | null = null): Promise<{ tokens: Token[] }> => {
  try {
    if (!apiKey) {
      throw new Error('API key required for token list');
    }
    
    const response = await fetch('https://api.oogabooga.com/v1/tokens', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${await response.text()}`);
    }
    
    const data = await response.json();
    
    // Transform API response to Token format
    const tokens: Token[] = data.map((token: any) => ({
      name: token.name,
      symbol: token.symbol,
      address: token.address,
      decimals: token.decimals,
      chainId: 80085, // Berachain testnet
      logoURI: token.tokenURI || '',
      isNative: token.address === '0x0000000000000000000000000000000000000000'
    }));
    
    // Ensure native BERA token is included
    if (!tokens.find(t => t.isNative)) {
      tokens.unshift({
        name: 'Bera',
        symbol: 'BERA',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        chainId: 80085,
        logoURI: '',
        isNative: true
      });
    }

    return { tokens };
  } catch (error) {
    console.error('Error fetching token list:', error);
    throw new Error('Failed to fetch token list');
  }
};

/**
 * Queries on-chain balances for given tokens
 * @param tokens - Array of tokens to check balances for
 * @param safeAddress - Address of the Safe to check balances for
 * @param provider - Ethers provider for blockchain queries
 * @returns Promise containing tokens with balance property added
 */
export const fetchTokenBalances = async (
  tokens: Token[],
  safeAddress: string,
  provider: ethers.Provider
): Promise<Token[]> => {
  try {
    const tokensWithBalances = await Promise.all(
      tokens.map(async (token) => {
        try {
          let balance = '0';

          if (token.isNative) {
            // Query native BERA balance
            balance = ethers.formatEther(await provider.getBalance(safeAddress));
          } else {
            // Query ERC20 token balance
            const tokenContract = new ethers.Contract(token.address, erc20Abi, provider);
            const rawBalance = await tokenContract.balanceOf(safeAddress);
            balance = ethers.formatUnits(rawBalance, token.decimals);
          }

          return {
            ...token,
            balance
          };
        } catch (error) {
          console.error(`Error fetching balance for token ${token.symbol}:`, error);
          return {
            ...token,
            balance: '0'
          };
        }
      })
    );

    return tokensWithBalances;
  } catch (error) {
    console.error('Error fetching token balances:', error);
    throw new Error('Failed to fetch token balances');
  }
};

/**
 * Fetches current USD prices for tokens from OogaBooga API
 * @param tokens - Array of tokens to fetch prices for
 * @param apiKey - OogaBooga API key for authentication
 * @returns Promise containing tokens with priceUsd property added
 */
export const fetchTokenPrices = async (
  tokens: Token[],
  apiKey: string | null = null
): Promise<Token[]> => {
  try {
    if (!apiKey) {
      // Return tokens without prices if no API key
      return tokens;
    }
    
    const response = await fetch('https://api.oogabooga.com/v1/prices', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${await response.text()}`);
    }
    
    const priceData = await response.json();
    
    // Map prices to tokens
    const priceMap = new Map<string, number>();
    priceData.forEach((item: { address: string; price: number }) => {
      priceMap.set(item.address.toLowerCase(), item.price);
    });
    
    const tokensWithPrices = tokens.map(token => {
      const address = token.isNative ? '0x0000000000000000000000000000000000000000' : token.address.toLowerCase();
      return {
        ...token,
        priceUsd: priceMap.get(address) || 0
      };
    });

    return tokensWithPrices;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    // Return tokens without prices on error
    return tokens;
  }
};