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
 * Fetch token list from the OogaBooga API
 * For Berachain, uses the /v1/tokens endpoint
 */
export const fetchTokenList = async (apiKey: string | null = null): Promise<{ tokens: Token[] }> => {
  try {
    // If no API key is provided, return a minimal default list
    if (!apiKey) {
      console.warn('No API key provided for token list, using default tokens');
      const defaultTokens: Token[] = [
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
        }
      ];
      return { tokens: defaultTokens };
    }
    
    // Fetch tokens from OogaBooga API
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
    
    // Transform API response to our Token format
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
        logoURI: 'https://assets.coingecko.com/coins/images/26409/small/berachain-logo.png',
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
 * Fetch token prices from the OogaBooga API
 */
export const fetchTokenPrices = async (
  tokens: Token[],
  apiKey: string | null = null
): Promise<Token[]> => {
  try {
    // If no API key is provided, return tokens with placeholder prices
    if (!apiKey) {
      console.warn('No API key provided for price fetch, using placeholder prices');
      return tokens.map(token => ({
        ...token,
        priceUsd: token.symbol === 'BERA' ? 10.5 : token.symbol === 'HONEY' ? 0.15 : 0
      }));
    }
    
    // Fetch prices from OogaBooga API
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
    
    // Create a map of token addresses to prices
    const priceMap = new Map<string, number>();
    priceData.forEach((item: { address: string; price: number }) => {
      priceMap.set(item.address.toLowerCase(), item.price);
    });
    
    // Apply prices to tokens
    const tokensWithPrices = tokens.map(token => {
      const address = token.isNative ? '0x0000000000000000000000000000000000000000' : token.address.toLowerCase();
      return {
        ...token,
        priceUsd: priceMap.has(address) ? priceMap.get(address) : token.priceUsd || 0
      };
    });

    return tokensWithPrices;
  } catch (error) {
    console.error('Error fetching token prices:', error);
    // Fall back to placeholder prices on error
    return tokens.map(token => ({
      ...token,
      priceUsd: token.priceUsd || (token.symbol === 'BERA' ? 10.5 : token.symbol === 'HONEY' ? 0.15 : 0)
    }));
  }
};