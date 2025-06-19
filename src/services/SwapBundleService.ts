/**
 * Swap Bundle Service - Creates bundled swap transactions for Safe
 * 
 * This service handles:
 * - Getting swap quotes from OogaBooga API in parallel
 * - Creating ERC20 approval transactions
 * - Creating swap transactions
 * - Bundling all transactions for Safe's native batching
 */

import { ethers } from 'ethers';
import { Token, TokenAmount } from '../types';

// ERC20 ABI for approval
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
];

/**
 * Service for creating bundled swap transactions
 */
class SwapBundleService {
  private sdk: any | null;
  private apiKey: string | null;
  private apiEndpoint: string;

  constructor() {
    this.sdk = null;
    this.apiKey = null;
    this.apiEndpoint = 'https://api.oogabooga.com/v1/swap';
  }

  /**
   * Initialize service with Safe SDK and API key
   * @param sdk - Safe Apps SDK instance
   * @param chainId - Chain ID (80085 for Berachain testnet)
   * @param apiKey - OogaBooga API key
   */
  initialize(sdk: any, chainId: number, apiKey?: string): boolean {
    this.sdk = sdk;
    
    if (apiKey) {
      this.apiKey = apiKey;
    }
    
    if (chainId !== 80085) {
      console.warn(`SwapBundleService: Chain ID ${chainId} is not fully supported yet`);
    }
    
    return Boolean(this.sdk);
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return Boolean(this.sdk);
  }

  /**
   * Create bundled transactions for multiple swaps
   * @param selectedTokens - Tokens and amounts to swap
   * @param targetToken - Token to receive from swaps
   * @param safeAddress - Address of the Safe
   * @param slippageTolerance - Slippage tolerance percentage (default 0.5%)
   * @returns Array of transactions and metadata
   */
  async prepareBundleTransactions(
    selectedTokens: TokenAmount[],
    targetToken: Token,
    safeAddress: string,
    slippageTolerance: number = 0.5
  ): Promise<{
    success: boolean;
    txs?: any[];
    error?: string;
    totalValueUsd?: number;
    estimatedOutput?: string;
  }> {
    if (!this.isInitialized()) {
      return { success: false, error: "SwapBundleService not initialized" };
    }

    if (!this.apiKey) {
      return { success: false, error: "API key not set" };
    }

    try {
      // Filter out zero amounts
      const validTokens = selectedTokens.filter(({ amount }) => parseFloat(amount) > 0);
      
      if (validTokens.length === 0) {
        return { success: false, error: "No valid swaps to execute" };
      }

      // Get swap quotes in parallel for speed (before prices move)
      const swapQuotes = await Promise.all(
        validTokens.map(({ token, amount }) => 
          this.getSwapQuote(token, amount, targetToken, slippageTolerance)
        )
      );

      // Build transactions array
      const transactions: any[] = [];
      let totalValueUsd = 0;
      let totalEstimatedOutput = ethers.parseEther("0");

      // Process each swap
      for (let i = 0; i < validTokens.length; i++) {
        const { token, amount } = validTokens[i];
        const quote = swapQuotes[i];

        // Add to totals
        if (token.priceUsd) {
          totalValueUsd += parseFloat(amount) * token.priceUsd;
        }
        totalEstimatedOutput = totalEstimatedOutput + ethers.parseUnits(quote.outputAmount, targetToken.decimals);

        // For ERC20 tokens, add approval transaction
        if (!token.isNative) {
          const approvalTx = await this.createApprovalTransaction(
            token,
            quote.routerAddress,
            amount,
            safeAddress
          );
          
          if (approvalTx) {
            transactions.push(approvalTx);
          }
        }

        // Add swap transaction
        transactions.push({
          to: quote.routerAddress,
          value: token.isNative ? ethers.parseUnits(amount, token.decimals).toString() : "0",
          data: quote.calldata
        });
      }

      // Calculate estimated output in human-readable format
      const estimatedOutput = ethers.formatUnits(totalEstimatedOutput, targetToken.decimals);

      return {
        success: true,
        txs: transactions,
        totalValueUsd,
        estimatedOutput
      };
    } catch (error: any) {
      console.error("Error preparing bundle transactions:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create approval transaction for ERC20 token
   * @param token - Token to approve
   * @param spender - Address to approve (router)
   * @param amount - Amount to approve
   * @param owner - Owner address (Safe)
   * @returns Approval transaction or null if not needed
   */
  private async createApprovalTransaction(
    token: Token,
    spender: string,
    amount: string,
    owner: string
  ): Promise<any | null> {
    try {
      const erc20Interface = new ethers.Interface(ERC20_ABI);
      
      // Always approve exact amount needed for security
      const amountBN = ethers.parseUnits(amount, token.decimals);
      
      const approvalData = erc20Interface.encodeFunctionData('approve', [
        spender,
        amountBN
      ]);

      return {
        to: token.address,
        value: "0",
        data: approvalData
      };
    } catch (error) {
      console.error(`Error creating approval for ${token.symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get swap quote from OogaBooga API
   * @param inputToken - Token to swap from
   * @param amount - Amount to swap (in token units)
   * @param outputToken - Token to receive
   * @param slippage - Slippage tolerance percentage
   * @returns Swap quote data
   */
  private async getSwapQuote(
    inputToken: Token, 
    amount: string, 
    outputToken: Token,
    slippage: number
  ): Promise<{
    routerAddress: string;
    calldata: string;
    outputAmount: string;
    minOutputAmount: string;
    priceImpact: number;
  }> {
    try {
      const isNative = inputToken.isNative || inputToken.symbol === 'BERA';
      const amountBN = ethers.parseUnits(amount, inputToken.decimals);
      
      // Call OogaBooga swap API
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          chainId: 80085, // Berachain testnet
          tokenIn: isNative ? 'native' : inputToken.address,
          tokenOut: outputToken.address,
          amount: amountBN.toString(),
          slippage
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      return {
        routerAddress: data.routerAddress,
        calldata: data.calldata,
        outputAmount: data.outputAmount,
        minOutputAmount: data.minOutputAmount,
        priceImpact: data.priceImpact || 0
      };
    } catch (error) {
      console.error('Error fetching swap quote:', error);
      throw error;
    }
  }
}

// Export singleton instance
const swapBundleService = new SwapBundleService();
export default swapBundleService;