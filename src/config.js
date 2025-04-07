/**
 * @file config.js
 * @description Configuration for BeraBundle Safe App
 */

/**
 * API configuration
 */
const apiConfig = {
  baseUrl: 'https://mainnet.api.oogabooga.io',
  apiKeyStorageKey: 'beraBundle_ApiKey', // LocalStorage key for API key
  defaultCacheTime: 5 * 60 * 1000 // 5 minutes
};

/**
 * Network configuration
 */
const networks = {
  berachain: {
    name: 'Berachain',
    chainId: '0x1385e', // 80094 in decimal
    rpcUrl: 'https://rpc.berachain.com',
    blockExplorer: 'https://berascan.com',
    honeyTokenAddress: '0x7EeCA4205fF31f947EdBd49195a7A88E6A91161B', 
    bgtTokenAddress: '0x656b95E550C07a9ffe548bd4085c72418Ceb1dba',
    nativeToken: {
      symbol: 'BERA',
      decimals: 18,
      address: '0x0000000000000000000000000000000000000000'
    }
  }
};

/**
 * UI configuration
 */
const uiConfig = {
  appName: 'BeraBundle Safe App',
  defaultSlippage: 0.05, // 5%
  refreshInterval: 60 * 1000, // 1 minute
  maxDecimalsDisplay: 6
};

/**
 * Export configuration
 */
export default {
  api: apiConfig,
  networks,
  ui: uiConfig,
  currentNetwork: networks.berachain // Default network
};