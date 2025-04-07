/**
 * BerabundlerService.js - Service for interacting with swap bundling
 * 
 * This is a minimal version that only includes reference to the contract format
 * for documentation purposes. In Safe App mode, we don't actually execute the bundle
 * but just prepare the transactions for the Safe.
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
 * In Safe App mode, this service is mostly for documentation
 */
class BerabundlerService {
  constructor() {
    // Contract address on Berachain
    this.contractAddress = '0xF9b3593C58cd1A2e3D1Fc8ff44Da6421B5828c18';
    this.provider = null;
    this.contract = null;
  }

  /**
   * Initialize the service with a provider
   * @param {ethers.providers.Web3Provider} provider - Ethers provider
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
   */
  isInitialized() {
    return Boolean(this.contract && this.signer);
  }
}

// Export singleton instance
const berabundlerService = new BerabundlerService();
export default berabundlerService;