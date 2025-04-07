import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { SafeProvider, useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk';
import './App.css';
import ApiKeyInput from './components/ApiKeyInput';
import SwapForm from './components/SwapForm';
import tokenBridge from './services/TokenBridge';
import metadataService from './services/MetadataService';

// SafeApp component that wraps the entire application
export default function App() {
  return (
    <SafeProvider>
      <BeraSwapApp />
    </SafeProvider>
  );
}

// Main application component that uses the Safe SDK
function BeraSwapApp() {
  // Safe Apps SDK hooks
  const { sdk, safe } = useSafeAppsSDK();

  // State management
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('oogaboogaApiKey') || '');
  const [tokens, setTokens] = useState([]);
  const [totalValueUsd, setTotalValueUsd] = useState('');
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [selectedTokens, setSelectedTokens] = useState([]);
  const [showSwapForm, setShowSwapForm] = useState(false);
  const [beraToken, setBeraToken] = useState(null);
  const [swapStatus, setSwapStatus] = useState({ loading: false, success: false, error: null });

  // Initialize services when API key is available
  useEffect(() => {
    if (apiKey) {
      // Initialize tokenBridge with Safe connection info
      tokenBridge.initialize(null, apiKey, null, sdk);
      console.log('Connected to Safe with address:', safe.safeAddress);
    }
  }, [apiKey, sdk, safe]);

  // Handle API key save
  const handleSaveApiKey = (newApiKey) => {
    localStorage.setItem('oogaboogaApiKey', newApiKey);
    setApiKey(newApiKey);
    // Re-initialize with new API key
    tokenBridge.initialize(null, newApiKey, null, sdk);
  };

  // Close swap form
  const handleCloseSwapForm = () => {
    setShowSwapForm(false);
  };

  // Load token balances
  async function loadTokenBalances() {
    if (!apiKey || !safe.safeAddress) return;

    setLoadingTokens(true);
    setTokenError('');
    setSelectedTokens([]);
    setShowSwapForm(false);

    try {
      // Use the Safe address instead of connected wallet
      const safeAddress = safe.safeAddress;
      console.log(`Loading token balances for Safe at ${safeAddress}`);

      // Load token metadata first
      let tokensMap = {};
      
      // Get token metadata from OogaBooga
      const oogaboogaTokensResult = await metadataService.getOogaBoogaTokens();
      
      if (oogaboogaTokensResult.success && oogaboogaTokensResult.tokens && oogaboogaTokensResult.tokens.data) {
        tokensMap = oogaboogaTokensResult.tokens.data;
        console.log(`Using OogaBooga tokens (${Object.keys(tokensMap).length} tokens)`);
      } else {
        // Fallback to GitHub tokens
        const githubTokensResult = await metadataService.getGitHubTokens();
        
        if (githubTokensResult.success && githubTokensResult.tokens && githubTokensResult.tokens.data) {
          // Convert GitHub token array to map for easier lookup
          const githubTokens = githubTokensResult.tokens.data;
          githubTokens.forEach(token => {
            tokensMap[token.address.toLowerCase()] = token;
          });
          console.log(`Using GitHub tokens (${Object.keys(tokensMap).length} tokens)`);
        } else {
          setTokenError("Failed to load token data. Please update metadata.");
          setLoadingTokens(false);
          return;
        }
      }

      // Get token balances using Safe services
      const balances = await sdk.safe.getBalances();
      console.log('Safe balances:', balances);

      // Process token balances
      const tokens = [];
      let nativeBalance = '0';

      // Process all balances from Safe
      balances.forEach(balance => {
        // Check if this is the native token
        const isNative = !balance.tokenInfo || balance.tokenInfo.type === 'NATIVE_TOKEN';
        const tokenAddress = isNative ? 'native' : balance.tokenInfo.address.toLowerCase();
        
        // Get token info from our metadata or use the info from Safe
        const tokenInfo = tokensMap[tokenAddress] || {
          address: tokenAddress,
          symbol: balance.tokenInfo?.symbol || 'UNKNOWN',
          name: balance.tokenInfo?.name || 'Unknown Token',
          decimals: balance.tokenInfo?.decimals || 18
        };

        const formattedBalance = ethers.utils.formatUnits(
          balance.balance,
          balance.tokenInfo?.decimals || 18
        );

        if (isNative) {
          nativeBalance = formattedBalance;
          
          // Create BERA token object
          const beraTokenObj = {
            name: 'BERA',
            symbol: 'BERA',
            address: 'native',
            decimals: 18,
            balance: formattedBalance,
            formattedBalance: parseFloat(formattedBalance).toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 6
            }),
            priceUsd: null,
            valueUsd: 0,
            formattedValueUsd: "$0.00",
            isNative: true
          };
          
          tokens.push(beraTokenObj);
          setBeraToken(beraTokenObj);
        } else {
          // Regular token
          tokens.push({
            ...tokenInfo,
            balance: formattedBalance,
            formattedBalance: parseFloat(formattedBalance).toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 6
            }),
            priceUsd: null,
            valueUsd: 0,
            formattedValueUsd: "$0.00"
          });
        }
      });

      // Fetch prices for all tokens
      const tokenAddresses = tokens.map(token => token.address);
      const priceFetchPromises = [...tokenAddresses].map(address => 
        tokenBridge.getTokenPrice(address)
          .then(price => ({ address, price }))
          .catch(error => {
            console.error(`Error fetching price for ${address}:`, error);
            return { address, price: null };
          })
      );
      
      // Wait for all price fetches to complete
      const priceResults = await Promise.all(priceFetchPromises);
      
      // Create a price lookup map
      const priceMap = {};
      priceResults.forEach(result => {
        priceMap[result.address] = result.price;
      });
      
      // Update token objects with price data
      tokens.forEach(token => {
        const price = priceMap[token.address];
        if (price !== null) {
          token.priceUsd = price;
          token.valueUsd = parseFloat(token.balance) * price;
          token.formattedValueUsd = token.valueUsd.toLocaleString(undefined, {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
        }
      });

      // Calculate total value in USD
      const totalValueUsd = tokens.reduce((sum, token) => sum + (token.valueUsd || 0), 0);
      
      // Update state
      setTokens(tokens);
      setTotalValueUsd(totalValueUsd.toLocaleString(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }));
      
    } catch (err) {
      console.error("Error loading token balances:", err);
      setTokenError(err.message || "Failed to load token balances");
    } finally {
      setLoadingTokens(false);
    }
  }

  // Execute token swap
  const handleSwap = async (swapData, totalValueUsd, estimatedOutput, bundleOptions = {}) => {
    if (!safe.safeAddress || swapData.length === 0) return;
    
    setSwapStatus({
      loading: true,
      success: false,
      error: null
    });
    
    try {
      console.log(`Creating swap bundle for ${swapData.length} tokens`);
      console.log("Swap data:", JSON.stringify(swapData, null, 2));
      console.log("Total value:", totalValueUsd);
      console.log("Target token:", bundleOptions.targetToken?.symbol || "BERA");
      console.log("Estimated output:", estimatedOutput);
      
      // Create a swap bundle using the TokenBridge
      const bundle = await tokenBridge.createSwapBundle(safe.safeAddress, swapData, bundleOptions);
      
      if (bundle.error) {
        throw new Error(`Failed to create swap bundle: ${bundle.error}`);
      }
      
      console.log("Created swap bundle:", JSON.stringify(bundle, null, 2));
      
      // Convert the bundle transactions to Safe transactions
      const safeTxs = [];
      
      // Add approval transactions if needed
      if (bundle.approvalTxs && bundle.approvalTxs.length > 0) {
        bundle.approvalTxs.forEach(tx => {
          safeTxs.push({
            to: tx.to,
            value: "0",
            data: tx.data
          });
        });
      }
      
      // Add swap transactions
      bundle.swapTxs.forEach(tx => {
        safeTxs.push({
          to: tx.to,
          value: tx.value || "0",
          data: tx.data
        });
      });
      
      console.log(`Submitting ${safeTxs.length} transactions to Safe`);
      
      // Submit the transactions to Safe
      const { safeTxHash } = await sdk.txs.send({
        txs: safeTxs
      });
      
      console.log(`Safe transaction created with hash: ${safeTxHash}`);
      
      // Update swap status
      setSwapStatus({
        loading: false,
        success: true,
        safeTxHash,
        error: null
      });
      
      // Clear selected tokens and close form
      setSelectedTokens([]);
      setShowSwapForm(false);
      
    } catch (err) {
      console.error("Swap error:", err);
      
      setSwapStatus({
        loading: false,
        success: false,
        error: err.message || "Failed to execute swap"
      });
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-logo">
          <h1>BERABUNDLE SAFE</h1>
        </div>
        
        <div className="header-actions">
          <div className="safe-address">
            Safe: {safe.safeAddress ? 
              `${safe.safeAddress.substring(0, 6)}...${safe.safeAddress.substring(safe.safeAddress.length - 4)}` : 
              'Not connected'}
          </div>
        </div>
      </header>

      <div className="main-content">
        <div className="content-wrapper">
          {/* API Key Input */}
          {!apiKey ? (
            <div className="api-key-container">
              <ApiKeyInput 
                onSave={handleSaveApiKey}
                savedKey={apiKey}
              />
            </div>
          ) : (
            <>
              {/* Token List */}
              <div className="token-list-container">
                <div className="section-header">
                  <h2>Tokens in your Safe</h2>
                  <button 
                    className={`refresh-button ${loadingTokens ? 'loading' : ''}`}
                    onClick={loadTokenBalances}
                    disabled={loadingTokens}
                  >
                    {loadingTokens ? 'Loading...' : 'Refresh Tokens'}
                  </button>
                </div>
                
                {tokenError && <p className="error-message">{tokenError}</p>}
                
                {loadingTokens ? (
                  <p>Loading token balances...</p>
                ) : tokens.length > 0 ? (
                  <>
                    <div className="total-value">Total Value: {totalValueUsd}</div>
                    <div className="token-grid">
                      {tokens.map(token => (
                        <div 
                          key={token.address}
                          className={`token-card ${selectedTokens.includes(token) ? 'selected' : ''}`}
                          onClick={() => {
                            if (selectedTokens.includes(token)) {
                              setSelectedTokens(selectedTokens.filter(t => t !== token));
                            } else {
                              setSelectedTokens([...selectedTokens, token]);
                            }
                          }}
                        >
                          <div className="token-symbol">{token.symbol}</div>
                          <div className="token-balance">{token.formattedBalance}</div>
                          <div className="token-value">{token.formattedValueUsd}</div>
                        </div>
                      ))}
                    </div>
                    
                    {selectedTokens.length > 0 && (
                      <button 
                        className="swap-button"
                        onClick={() => setShowSwapForm(true)}
                      >
                        Swap {selectedTokens.length} Token{selectedTokens.length !== 1 ? 's' : ''}
                      </button>
                    )}
                  </>
                ) : (
                  <p>No tokens found. Click "Refresh Tokens" to load your token balances.</p>
                )}
              </div>
              
              {/* Status Messages */}
              <div className="status-messages">
                {swapStatus.loading && (
                  <div className="status loading">
                    Preparing swap transaction... Please wait.
                  </div>
                )}
                
                {swapStatus.success && (
                  <div className="status success">
                    Swap transaction prepared successfully! Please check your Safe interface to review and execute the transaction.
                  </div>
                )}
                
                {swapStatus.error && (
                  <div className="status error">
                    Error: {swapStatus.error}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Swap Form (modal) */}
      {showSwapForm && (
        <div className="swap-form-overlay">
          <SwapForm 
            selectedTokens={selectedTokens}
            beraToken={beraToken}
            onClose={handleCloseSwapForm}
            onSwap={handleSwap}
            safeMode={true}
          />
        </div>
      )}
    </div>
  );
}