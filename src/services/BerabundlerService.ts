import { ethers } from 'ethers';
import { SafeAppsSdk } from '@safe-global/safe-apps-sdk';
import { SwapOperation, Token, TokenAmount } from '../types';

// ABI for the Berabundle_SwapBundler contract
const BERABUNDLE_ABI = [
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint8",
            "name": "operationType",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "target",
            "type": "address"
          },
          {
            "internalType": "bytes",
            "name": "data",
            "type": "bytes"
          },
          {
            "internalType": "uint256",
            "name": "value",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "tokenAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "tokenAmount",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "outputToken",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "minOutputAmount",
            "type": "uint256"
          }
        ],
        "internalType": "struct Berabundle_SwapBundler.Operation[]",
        "name": "operations",
        "type": "tuple[]"
      }
    ],
    "name": "executeBundle",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

// Operation types
const TYPE_APPROVE = 1;
const TYPE_SWAP = 2;

// ERC20 Interface for approvals
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)'
];

/**
 * Service for interacting with the Berabundle_SwapBundler contract via Safe
 */
class BerabundlerService {
  private contractAddress: string;
  private sdk: SafeAppsSdk | null;
  private bundlerApis: Record<number, string>;
  private apiKey: string | null;

  constructor() {
    // Different contract addresses for different chains
    this.contractAddress = '0xF9b3593C58cd1A2e3D1Fc8ff44Da6421B5828c18'; // Berachain default
    this.sdk = null;
    this.apiKey = null;
    
    // API endpoints for different chains
    this.bundlerApis = {
      80085: 'https://api.oogabooga.com/v1/swap' // Berachain testnet
    };
  }

  /**
   * Initialize the service with a Safe Apps SDK
   */
  initialize(sdk: SafeAppsSdk, chainId: number, apiKey?: string): boolean {
    this.sdk = sdk;
    
    // Set API key if provided
    if (apiKey) {
      this.apiKey = apiKey;
    }
    
    // Potentially switch contract address based on chain
    if (chainId !== 80085) {
      console.warn(`BerabundlerService: Chain ID ${chainId} is not fully supported yet`);
    }
    
    return Boolean(this.sdk);
  }
  
  /**
   * Set the API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return Boolean(this.sdk);
  }

  /**
   * Create operations for token approvals
   */
  createApprovalOperations(approvalTxs: any[]): SwapOperation[] {
    return approvalTxs.map(tx => {
      if (!tx.to || !tx.token || !tx.token.address) {
        console.error("Invalid approval transaction:", tx);
        return null;
      }
      
      return {
        operationType: TYPE_APPROVE,
        target: tx.to, // The router/spender address
        data: "0x", // We don't need data for approvals as the contract handles it
        value: "0",
        tokenAddress: tx.token.address, // The token contract address
        tokenAmount: ethers.MaxUint256.toString(), // Max approval
        outputToken: ethers.ZeroAddress, // Not used for approvals
        minOutputAmount: "0" // Not used for approvals
      };
    }).filter(op => op !== null) as SwapOperation[];
  }

  /**
   * Create operations for token swaps
   */
  createSwapOperations(swapTxs: any[]): SwapOperation[] {
    return swapTxs.map(tx => {
      // Check if this is a native token or ERC20 token swap
      const isNativeToken = tx.token.address === 'native' || tx.token.symbol === 'BERA' || tx.token.isNative;
      
      // Extract swapParams for the swap
      const swapParams = tx.swapParams || {};
      
      // Use API's transaction data directly
      return {
        operationType: TYPE_SWAP,
        target: tx.to, // Router address from API
        data: tx.data, // Use exact data from API response
        value: tx.value || "0",
        tokenAddress: isNativeToken ? ethers.ZeroAddress : tx.token.address,
        tokenAmount: isNativeToken ? "0" : tx.token.amountIn || tx.amount || "0",
        outputToken: swapParams.outputToken || ethers.ZeroAddress,
        minOutputAmount: swapParams.minOutput || "0"
      };
    });
  }

  /**
   * Create direct approval transactions for the Safe
   */
  async createApprovalTransactions(
    tokenAmount: TokenAmount, 
    routerAddress: string
  ): Promise<any[]> {
    if (!this.isInitialized()) throw new Error("BerabundlerService not initialized");
    
    const { token, amount } = tokenAmount;
    
    // Skip native token (no approval needed)
    if (token.isNative || token.address === 'native' || token.symbol === 'BERA') {
      return [];
    }
    
    // Create approval transaction
    const erc20Interface = new ethers.Interface(ERC20_ABI);
    const data = erc20Interface.encodeFunctionData('approve', [
      routerAddress,
      ethers.parseUnits(amount, token.decimals)
    ]);
    
    return [{
      to: token.address,
      value: "0",
      data
    }];
  }

  /**
   * Prepare swap transactions for the berabundle contract via Safe
   */
  async prepareBundleTransactions(
    selectedTokens: TokenAmount[],
    targetToken: Token,
    slippageTolerance: number = 0.5
  ): Promise<{
    success: boolean;
    txs?: any[];
    error?: string;
    totalValueUsd?: number;
    estimatedOutput?: string;
  }> {
    if (!this.isInitialized()) {
      return { success: false, error: "BerabundlerService not initialized" };
    }

    try {
      // 1. Prepare API requests for each token swap
      const swapRequests = await Promise.all(
        selectedTokens.map(async ({ token, amount }) => {
          // Skip tokens with zero amount
          if (parseFloat(amount) <= 0) return null;
          
          try {
            // Get real swap quote from OogaBooga API
            const apiResponse = await this.getSwapQuote(token, amount, targetToken);
            
            return {
              ...apiResponse,
              token,
              amount
            };
          } catch (error) {
            console.error(`Failed to get swap quote for ${token.symbol}:`, error);
            throw error;
          }
        })
      );

      // Filter out null results
      const validSwapRequests = swapRequests.filter(req => req !== null) as any[];
      
      if (validSwapRequests.length === 0) {
        return { success: false, error: "No valid swaps to execute" };
      }

      // 2. Create operations for the bundle
      const operations = [
        ...this.createSwapOperations(validSwapRequests)
      ];

      // 3. Calculate total value for native token transfers
      let totalValue = ethers.parseEther("0");
      let totalValueUsd = 0;
      let estimatedOutput = ethers.parseEther("0");
      
      operations.forEach(op => {
        if (op.value && op.value !== "0") {
          const opValue = ethers.parseUnits(op.value, 18);
          totalValue = totalValue + opValue;
        }
        
        // Track USD value and estimated output for UI
        const token = selectedTokens.find(t => 
          t.token.address === op.tokenAddress || 
          (op.tokenAddress === ethers.ZeroAddress && t.token.isNative)
        );
        
        if (token && token.token.priceUsd) {
          totalValueUsd += parseFloat(token.amount) * token.token.priceUsd;
        }
      });

      // Estimate output in target token
      if (targetToken.priceUsd && totalValueUsd > 0) {
        const outputAmount = totalValueUsd / targetToken.priceUsd;
        estimatedOutput = outputAmount.toString();
      }

      // 4. Encode calldata for the berabundle contract
      const berabundleInterface = new ethers.Interface(BERABUNDLE_ABI);
      const calldata = berabundleInterface.encodeFunctionData('executeBundle', [operations]);

      // 5. Create transaction for the Safe
      const transaction = {
        to: this.contractAddress,
        value: totalValue.toString(),
        data: calldata
      };

      return {
        success: true,
        txs: [transaction],
        totalValueUsd,
        estimatedOutput: estimatedOutput.toString()
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
   * Get a swap quote from the OogaBooga API
   */
  private async getSwapQuote(
    inputToken: Token, 
    amount: string, 
    outputToken: Token
  ): Promise<any> {
    if (!this.apiKey) {
      throw new Error('API key not set. Please set your OogaBooga API key.');
    }

    try {
      // Prepare API request
      const chainId = 80085; // Berachain testnet
      const apiEndpoint = this.bundlerApis[chainId];
      
      if (!apiEndpoint) {
        throw new Error(`No API endpoint for chain ID ${chainId}`);
      }
      
      const isNative = inputToken.isNative || inputToken.symbol === 'BERA';
      const amountBN = ethers.parseUnits(amount, inputToken.decimals);
      
      // Make the API request
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          chainId,
          tokenIn: isNative ? 'native' : inputToken.address,
          tokenOut: outputToken.address,
          amount: amountBN.toString(),
          slippage: 0.5 // 0.5% slippage
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      return {
        to: data.routerAddress,
        data: data.calldata,
        value: isNative ? amountBN.toString() : "0",
        swapParams: {
          outputToken: outputToken.address,
          minOutput: data.minOutputAmount,
          router: data.routerAddress
        }
      };
    } catch (error) {
      console.error('Error fetching swap quote:', error);
      throw error;
    }
  }
}

// Export singleton instance
const berabundlerService = new BerabundlerService();
export default berabundlerService;