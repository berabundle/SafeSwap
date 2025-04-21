import { ethers } from 'ethers';
import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk';
import { Token } from '../types';

// Standard ERC20 ABI for balanceOf function
const erc20Abi = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

/**
 * Fetch token list from a token list provider
 * For Berachain, we'll use a basic token list
 */
export const fetchTokenList = async (): Promise<{ tokens: Token[] }> => {
  try {
    // Note: For a production app, you'd want to fetch this from a token list API
    // This is a simplified version for Berachain
    
    // Example of a basic token list for Berachain (testnet)
    const tokens: Token[] = [
      {
        name: 'Bera',
        symbol: 'BERA',
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        chainId: 80085, // Berachain testnet
        logoURI: 'https://assets.coingecko.com/coins/images/26409/small/berachain-logo.png',
        isNative: true
      },
      {
        name: 'Honey',
        symbol: 'HONEY',
        address: '0x7EeCA4205fF31f947EdBd49195a7A88E6A91161B',
        decimals: 18,
        chainId: 80085,
        logoURI: 'https://assets.coingecko.com/coins/images/28193/small/honey-icon.png'
      },
      // Add more Berachain tokens as needed
    ];

    return { tokens };
  } catch (error) {
    console.error('Error fetching token list:', error);
    throw new Error('Failed to fetch token list');
  }
};

/**
 * Fetch token balances for a given safe address
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
            // For native token (BERA)
            balance = ethers.formatEther(await provider.getBalance(safeAddress));
          } else {
            // For ERC20 tokens
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
 * Custom hook to fetch token prices from an API
 */
export const fetchTokenPrices = async (
  tokens: Token[]
): Promise<Token[]> => {
  try {
    // This would normally fetch prices from an API
    // For now, we'll use placeholder prices
    const tokensWithPrices = tokens.map(token => ({
      ...token,
      priceUsd: token.symbol === 'BERA' ? 10.5 : token.symbol === 'HONEY' ? 0.15 : 0
    }));

    return tokensWithPrices;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    return tokens; // Return tokens without prices on error
  }
};