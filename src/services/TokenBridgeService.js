/**
 * @file TokenBridgeService.js
 * @description Service for token operations in the Safe App
 * 
 * This service handles token price fetching, creating swap transaction bundles,
 * and preparing transactions for the Safe multi-signature wallet.
 */

import { ethers } from 'ethers';
import berabundlerService from './BerabundlerService';

/**
 * Service for fetching token prices and preparing swap transactions
 */
class TokenBridgeService {
  constructor() {
    this.priceCache = {};
    this.priceExpiry = 5 * 60 * 1000; // 5 minutes
    this.apiKey = null; // Will need to be set by the user
    this.apiBaseUrl = 'https://mainnet.api.oogabooga.io';
    this.safeSDK = null; // Safe Apps SDK instance
  }
  
  /**
   * Initialize the bridge with API key and Safe SDK
   * @param {ethers.providers.Web3Provider|null} provider - Ethers provider (not used in Safe mode)
   * @param {string} apiKey - OogaBooga API key
   * @param {ethers.Signer|null} signer - Ethers signer (not used in Safe mode)
   * @param {Object} safeSDK - Safe Apps SDK instance
   * @returns {boolean} True if initialization was successful
   */
  initialize(provider, apiKey, signer, safeSDK) {
    this.apiKey = apiKey;
    this.safeSDK = safeSDK;
    
    return Boolean(apiKey);
  }
  
  /**
   * Check if the bridge is initialized
   * @returns {boolean} True if the service is properly initialized
   */
  isInitialized() {
    return Boolean(this.apiKey);
  }
  
  /**
   * Makes an authenticated API call to the OogaBooga API
   * 
   * @param {string} endpoint - API endpoint path
   * @returns {Promise<Object>} API response data
   * @throws {Error} If API key is missing or API call fails
   */
  async apiCallWithAuth(endpoint) {
    if (!this.apiKey) {
      throw new Error("API key not set. Please provide an API key in the settings.");
    }
    
    const url = endpoint.startsWith('http') ? endpoint : `${this.apiBaseUrl}${endpoint}`;
    
    try {
      const requestConfig = {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${this.apiKey.trim()}`,
          'Accept': 'application/json'
        }
      };
      
      const response = await fetch(url, requestConfig);
      
      if (response.ok) {
        const responseData = await response.json();
        return responseData;
      } else {
        let errorDetails = '';
        try {
          const errorResponse = await response.text();
          errorDetails = errorResponse;
        } catch (e) {
          console.warn('Could not parse error response:', e);
        }
        
        throw new Error(`API error: ${response.status} ${response.statusText}${errorDetails ? ` - ${errorDetails}` : ''}`);
      }
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }
  
  /**
   * Retrieves the current USD price for a token with caching
   * 
   * @param {string} tokenAddress - Token contract address or 'BERA'/'native' for native token
   * @returns {Promise<number|null>} Current price in USD or null if unavailable
   */
  async getTokenPrice(tokenAddress) {
    try {
      if (!tokenAddress) {
        return null;
      }
      
      // Check cache first for faster responses
      if (this.priceCache[tokenAddress] && 
          Date.now() - this.priceCache[tokenAddress].timestamp < this.priceExpiry) {
        return this.priceCache[tokenAddress].price;
      }
      
      // Format token address correctly for API
      // Convert native token references to the zero address
      const tokenParam = tokenAddress === 'BERA' || tokenAddress === 'native' 
        ? '0x0000000000000000000000000000000000000000' 
        : tokenAddress;
          
      // Fetch prices from API
      const response = await this.apiCallWithAuth('/v1/prices?currency=USD');
      
      // Response is an array of {address, price} objects
      if (response && Array.isArray(response)) {
        // Find the token in the price list (case-insensitive comparison)
        const tokenPrice = response.find(item => 
          item.address.toLowerCase() === tokenParam.toLowerCase()
        );
        
        if (tokenPrice && tokenPrice.price) {
          const price = parseFloat(tokenPrice.price);
          
          // Update cache with expiration timestamp
          this.priceCache[tokenAddress] = {
            price,
            timestamp: Date.now()
          };
          
          return price;
        }
      }
      
      // Price wasn't found in the response
      return null;
      
    } catch (error) {
      console.error("Error fetching token price:", error);
      return null;
    }
  }

  /**
   * Creates a swap bundle for the Safe wallet
   * @param {string} safeAddress - Safe wallet address
   * @param {Array<Object>} tokensToSwap - Array of token objects with amount to swap
   * @param {Object} options - Additional options for bundle creation
   * @param {Object} options.targetToken - The token to swap to (defaults to BERA)
   * @param {number} options.slippage - Maximum acceptable slippage (default: 0.05 or 5%)
   * @returns {Promise<Object>} Bundle containing transaction data
   */
  async createSwapBundle(safeAddress, tokensToSwap, options = {}) {
    try {
      if (!safeAddress) {
        throw new Error("Safe address is required");
      }

      if (!tokensToSwap || !tokensToSwap.length) {
        throw new Error("No tokens provided for swap");
      }
      
      // Set default target token to BERA if not specified
      const targetToken = options.targetToken || { 
        address: '0x0000000000000000000000000000000000000000', 
        symbol: 'BERA', 
        decimals: 18 
      };
      
      const slippage = options.slippage || 0.05; // Default 5% slippage
      
      // Filter out native BERA tokens (can't swap native token to itself)
      const tokensToProcess = tokensToSwap.filter(token => {
        return !(token.address === 'native' || token.symbol === 'BERA') && token.address;
      });
      
      if (tokensToProcess.length === 0) {
        return {
          error: "No valid tokens to swap",
          safeAddress,
          swapTxs: [],
          approvalTxs: []
        };
      }
      
      // Create array of API call promises for parallel processing
      const apiCallPromises = tokensToProcess.map(async (token) => {
        try {
          // Convert the token amount to wei
          const amountIn = ethers.utils.parseUnits(
            token.amount.toString(),
            token.decimals || 18
          );
          
          // Create API endpoint for swap quote
          const targetTokenAddress = targetToken.address;
          const endpoint = `/v1/swap?tokenIn=${token.address}&tokenOut=${targetTokenAddress}&amount=${amountIn.toString()}&slippage=${slippage}&to=${safeAddress}`;
          
          const quoteResponse = await this.apiCallWithAuth(endpoint);
          
          if (!quoteResponse || !quoteResponse.tx) {
            throw new Error(`Swap response doesn't contain transaction data for ${token.symbol}`);
          }
          
          return {
            token,
            amountIn,
            quoteResponse
          };
        } catch (error) {
          return {
            token,
            amountIn: null,
            error: error.message || "Failed to get swap quote"
          };
        }
      });
      
      // Wait for all API calls to complete in parallel
      const results = await Promise.all(apiCallPromises);
      
      // Process the results to build the swap transactions
      const swapTransactions = [];
      const approvalTransactions = [];
      
      // Process API results and build transactions
      for (const result of results) {
        // Skip results with errors
        if (!result || result.error) {
          continue;
        }
        
        const { token, amountIn, quoteResponse } = result;
        const { tx } = quoteResponse;
        
        // Ensure the router address is valid
        if (!tx.to) {
          continue;
        }
        
        // For a Safe app, we need to add approval transactions for each token
        const approvalData = ethers.utils.defaultAbiCoder.encode(
          ['address', 'uint256'],
          [tx.to, ethers.constants.MaxUint256]
        );
        
        // Create approval transaction using token's approve function
        const approvalTx = {
          to: token.address,
          data: '0x095ea7b3' + approvalData.slice(2), // approve(address,uint256) signature + data
          token // Include token info for reference
        };
        
        approvalTransactions.push(approvalTx);
        
        // Create swap transaction
        const swapTx = {
          to: tx.to,
          data: tx.data,
          value: tx.value || "0x0",
          token: {
            ...token,
            amountIn: amountIn.toString()
          },
          swapParams: {
            outputToken: targetToken.address,
            outputQuote: quoteResponse.assumedAmountOut || quoteResponse.expectedAmountOut,
            minOutput: quoteResponse.minAmountOut || "0"
          },
          quote: {
            expectedAmountOut: quoteResponse.assumedAmountOut || quoteResponse.expectedAmountOut,
            formattedAmountOut: ethers.utils.formatUnits(
              quoteResponse.assumedAmountOut || quoteResponse.expectedAmountOut,
              targetToken.decimals || 18
            ),
            minAmountOut: quoteResponse.minAmountOut || "0",
            priceImpact: quoteResponse.priceImpact
          }
        };
        
        swapTransactions.push(swapTx);
      }
      
      // If no valid swap transactions were created
      if (swapTransactions.length === 0) {
        return {
          error: "Failed to create any valid swap transactions",
          safeAddress,
          swapTxs: [],
          approvalTxs: []
        };
      }
      
      // Calculate total expected output
      const totalExpectedOutput = swapTransactions.reduce(
        (sum, tx) => sum + parseFloat(tx.quote.formattedAmountOut || '0'),
        0
      );
      
      return {
        safeAddress,
        swapTxs: swapTransactions,
        approvalTxs: approvalTransactions,
        totalExpectedOutput,
        formattedTotalExpectedOutput: totalExpectedOutput.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 6
        }) + ' ' + targetToken.symbol
      };
    } catch (error) {
      console.error("Error creating swap bundle:", error);
      return {
        error: error.message,
        safeAddress,
        swapTxs: [],
        approvalTxs: []
      };
    }
  }
}

// Export singleton instance
const tokenBridgeService = new TokenBridgeService();
export default tokenBridgeService;