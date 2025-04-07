/**
 * @file BerabundlerService.js
 * @description Service for interacting with the BeraBundle SwapBundler contract
 * 
 * This is a minimal version that only includes the contract format reference
 * for documentation purposes. In Safe App mode, we don't directly execute the bundle
 * but prepare transactions for the Safe wallet interface.
 */

import { ethers } from 'ethers';

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

/**
 * Service for interacting with the Berabundle_SwapBundler contract
 * In Safe App mode, this service is mostly for reference since transactions
 * are prepared and executed through the Safe interface.
 */
class BerabundlerService {
  constructor() {
    // Contract address on Berachain
    this.contractAddress = '0xF9b3593C58cd1A2e3D1Fc8ff44Da6421B5828c18';
    this.provider = null;
    this.signer = null;
    this.contract = null;
  }

  /**
   * Initialize the service with a provider and signer
   * @param {ethers.providers.Web3Provider} provider - Ethers provider
   * @param {ethers.Signer} signer - Ethers signer
   * @returns {boolean} Whether initialization was successful
   */
  initialize(provider, signer) {
    this.provider = provider;
    this.signer = signer;
    
    if (provider && signer) {
      this.contract = new ethers.Contract(this.contractAddress, BERABUNDLE_ABI, signer);
    }
    
    return Boolean(this.contract);
  }

  /**
   * Check if the service is initialized
   * @returns {boolean} True if service is initialized with contract and signer
   */
  isInitialized() {
    return Boolean(this.contract && this.signer);
  }
  
  /**
   * Get the contract address
   * @returns {string} The contract address
   */
  getContractAddress() {
    return this.contractAddress;
  }
}

// Export singleton instance
const berabundlerService = new BerabundlerService();
export default berabundlerService;