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

  constructor() {
    // Different contract addresses for different chains
    this.contractAddress = '0xF9b3593C58cd1A2e3D1Fc8ff44Da6421B5828c18'; // Berachain default
    this.sdk = null;
    
    // API endpoints for different chains
    this.bundlerApis = {
      80085: 'https://api.oogabooga.com/v1/swap' // Berachain testnet
    };
  }

  /**
   * Initialize the service with a Safe Apps SDK
   */
  initialize(sdk: SafeAppsSdk, chainId: number): boolean {
    this.sdk = sdk;
    
    // Potentially switch contract address based on chain
    if (chainId !== 80085) {
      console.warn(`BerabundlerService: Chain ID ${chainId} is not fully supported yet`);
    }
    
    return Boolean(this.sdk);
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
          
          // Prepare mock API response (in a real application this would call the OogaBooga API)
          // This is a simplified example
          const mockApiResponse = await this.getMockSwapQuote(token, amount, targetToken);
          
          return {
            ...mockApiResponse,
            token,
            amount
          };
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
   * Get a mock swap quote (in a real app, this would call the OogaBooga API)
   */
  private async getMockSwapQuote(
    inputToken: Token, 
    amount: string, 
    outputToken: Token
  ): Promise<any> {
    // This is a mock implementation for demonstration purposes
    // In a real app, you would call the actual OogaBooga API

    // Mock router address
    const routerAddress = "0x9e5AAC1Ba1a2e6aEd6b32689DFcF62A509Ca96f3";
    
    // Get some realistic-looking data for the quote
    const isNative = inputToken.isNative || inputToken.symbol === 'BERA';
    const amountBN = ethers.parseUnits(amount, inputToken.decimals);
    
    // Calculate mock output (assumes prices are available)
    const inputValueUsd = inputToken.priceUsd 
      ? parseFloat(amount) * inputToken.priceUsd 
      : parseFloat(amount);
      
    const outputAmount = outputToken.priceUsd 
      ? inputValueUsd / outputToken.priceUsd 
      : parseFloat(amount) * 0.95; // Fallback with 5% slippage
    
    // Format output amount with appropriate decimals
    const minOutputAmount = (outputAmount * 0.95).toString(); // 5% slippage
    
    // Mock swap API response format
    return {
      to: routerAddress,
      data: "0x", // This would be actual swap calldata from API
      value: isNative ? amountBN.toString() : "0",
      swapParams: {
        outputToken: outputToken.address,
        minOutput: minOutputAmount,
        router: routerAddress
      }
    };
  }
}

// Export singleton instance
const berabundlerService = new BerabundlerService();
export default berabundlerService;