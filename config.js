// config.js - Configuration for BeraBundle Safe App

// Network configuration
const networks = {
  berachain: {
    name: 'Berachain',
    chainId: '0x1385e', // 80094 in decimal
    rpcUrl: 'https://rpc.berachain.com',
    blockExplorer: 'https://berascan.com',
    honeyTokenAddress: '0x7EeCA4205fF31f947EdBd49195a7A88E6A91161B', 
    bgtTokenAddress: '0x656b95E550C07a9ffe548bd4085c72418Ceb1dba'
  }
};

module.exports = {
  networks,
  currentNetwork: networks.berachain // Default network
};