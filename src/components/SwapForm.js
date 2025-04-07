import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './SwapForm.css';
import tokenBridgeService from '../services/TokenBridgeService';
import tokenMetadataService from '../services/TokenMetadataService';
import config from '../config';

/**
 * Component for creating token swap transactions
 * 
 * @param {Object} props Component props
 * @param {Array} props.selectedTokens Array of selected tokens to swap
 * @param {Object} props.beraToken BERA token data
 * @param {Function} props.onClose Callback to close the swap form
 * @param {Function} props.onSwap Callback to execute the swap
 * @param {Boolean} props.safeMode Whether we're running in Safe App mode
 */
function SwapForm({ selectedTokens, beraToken, onClose, onSwap, safeMode = false }) {
  const [swapAmounts, setSwapAmounts] = useState({});
  const [totalValueUsd, setTotalValueUsd] = useState(0);
  const [estimatedOutput, setEstimatedOutput] = useState(0);
  const [targetToken, setTargetToken] = useState({ address: '0x0000000000000000000000000000000000000000', symbol: 'BERA', decimals: 18 });
  const [availableTokens, setAvailableTokens] = useState([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [error, setError] = useState('');

  // Initialize swap amounts with MAX by default
  useEffect(() => {
    if (selectedTokens && selectedTokens.length > 0) {
      const initialAmounts = {};
      
      // Set all tokens to MAX by default
      selectedTokens.forEach(token => {
        const amount = parseFloat(token.balance).toFixed(3);
        const numericAmount = parseFloat(amount);
        const valueUsd = token.priceUsd ? numericAmount * token.priceUsd : 0;
        
        initialAmounts[token.address] = {
          rawInput: amount,
          amount: numericAmount,
          valueUsd,
          isValid: true
        };
      });
      
      setSwapAmounts(initialAmounts);
    }
  }, [selectedTokens]);
  
  // Load available tokens from metadata service
  useEffect(() => {
    async function loadAvailableTokens() {
      setIsLoadingTokens(true);
      try {
        // Get tokens with fallback
        const result = await tokenMetadataService.getTokenMetadata();
        
        if (result.success && result.tokens) {
          let tokenArray = [];
          
          // Convert token data to array if it's an object
          if (result.tokens.data && typeof result.tokens.data === 'object') {
            if (Array.isArray(result.tokens.data)) {
              tokenArray = result.tokens.data;
            } else {
              tokenArray = Object.values(result.tokens.data);
            }
          }
          
          // Sort tokens by symbol
          const sortedTokens = [...tokenArray].sort((a, b) => a.symbol.localeCompare(b.symbol));
          
          setAvailableTokens(sortedTokens);
          
          // Pre-select native token as target token by default
          const nativeToken = config.networks.currentNetwork.nativeToken;
          const defaultToken = sortedTokens.find(token => 
            token.symbol === nativeToken.symbol || 
            token.address.toLowerCase() === nativeToken.address.toLowerCase()
          );
          
          if (defaultToken) {
            setTargetToken(defaultToken);
          }
        } else {
          console.error("Failed to load tokens:", result.error);
        }
      } catch (error) {
        console.error("Error loading tokens:", error);
      } finally {
        setIsLoadingTokens(false);
      }
    }
    
    loadAvailableTokens();
  }, []);

  // Update total values when amounts change
  useEffect(() => {
    let total = 0;
    let valid = false;

    // Calculate total value
    Object.values(swapAmounts).forEach(tokenData => {
      total += tokenData.valueUsd || 0;
      if (tokenData.isValid) valid = true;
    });

    // Calculate estimated output based on target token
    let estimatedOutput = 0;
    if (targetToken && targetToken.priceUsd && total > 0) {
      estimatedOutput = total / targetToken.priceUsd;
    } else if (targetToken && targetToken.symbol === 'BERA' && beraToken && beraToken.priceUsd && total > 0) {
      // Fallback to using beraToken price if available
      estimatedOutput = total / beraToken.priceUsd;
    }

    setTotalValueUsd(total);
    setEstimatedOutput(estimatedOutput);
    setIsValid(valid);
  }, [swapAmounts, targetToken, beraToken]);

  // Handle amount change for a token
  const handleAmountChange = (token, value) => {
    // Store raw input value for display
    const inputValue = value.trim();
    
    // Parse numeric value for calculations
    const numericAmount = parseFloat(inputValue);
    
    // Validate amount
    const isValid = 
      inputValue !== '' && 
      !isNaN(numericAmount) && 
      numericAmount > 0 && 
      numericAmount <= parseFloat(token.balance);
    
    // Calculate value in USD
    const valueUsd = isValid && token.priceUsd 
      ? numericAmount * token.priceUsd 
      : 0;
    
    // Update state
    setSwapAmounts(prev => ({
      ...prev,
      [token.address]: {
        rawInput: inputValue,      // Store raw input value
        amount: isValid ? numericAmount : 0, // Store numeric amount
        valueUsd,
        isValid
      }
    }));

    // Clear error if any input is valid
    if (isValid) {
      setError('');
    }
  };

  // Handle percentage selection
  const handlePercentClick = (token, percentage) => {
    if (percentage === 0) {
      handleAmountChange(token, '0');
      return;
    }
    
    const amount = (parseFloat(token.balance) * (percentage / 100)).toFixed(3);
    handleAmountChange(token, amount);
  };

  /**
   * Get token price for the selected target token
   * @param {Object} token - The token to get price for
   * @returns {Promise<number|null>} The token price or null if not available
   */
  const getTargetTokenPrice = async (token) => {
    if (!token || !token.address) return null;
    
    try {
      return await tokenBridgeService.getTokenPrice(token.address);
    } catch (error) {
      console.error(`Error getting price for ${token.symbol}:`, error);
      return null;
    }
  };
  
  // Handle target token change
  const handleTargetTokenChange = async (event) => {
    const tokenAddress = event.target.value;
    const selected = availableTokens.find(token => token.address === tokenAddress);
    
    if (selected) {
      console.log("[DEBUG] Selected target token:", selected);
      
      // Update the target token state
      setTargetToken(prev => ({ ...selected }));
      
      // Get price for the new target token if not available
      if (!selected.priceUsd) {
        const price = await getTargetTokenPrice(selected);
        if (price) {
          setTargetToken(prev => ({ ...prev, priceUsd: price }));
        }
      }
    }
  };
  
  // Handle swap button click
  const handleSwap = () => {
    if (!isValid) {
      setError('Please enter valid amounts for at least one token');
      return;
    }

    // Create swap data based on the form inputs
    const swapData = selectedTokens
      .filter(token => swapAmounts[token.address]?.isValid)
      .map(token => ({
        ...token, // Include all token data
        amount: swapAmounts[token.address].amount.toString(),
        valueUsd: swapAmounts[token.address].valueUsd
      }));

    // Create bundle options that include the target token
    const bundleOptions = {
      targetToken: targetToken,
      regenerateOnExecute: true // Flag to ensure fresh quotes for the current target token
    };

    console.log(`Executing swap with target token: ${targetToken.symbol} (${targetToken.address})`);
    console.log(`Selected amount(s): ${swapData.map(token => `${token.amount} ${token.symbol}`).join(', ')}`);
    console.log(`Estimated output: ${estimatedOutput.toFixed(6)} ${targetToken.symbol}`);

    // Call the parent's onSwap function
    onSwap(swapData, totalValueUsd, estimatedOutput, bundleOptions);
  };

  // If no valid tokens are selected
  if (!selectedTokens || selectedTokens.length === 0) {
    return (
      <div className="swap-form">
        <div className="swap-form-header">
          <h2>Swap Tokens</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="swap-form-content">
          <p className="error-message">No tokens selected for swap. Please select at least one token.</p>
          <button className="cancel-button" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="swap-form">
      <div className="swap-form-header">
        <h2>Swap Tokens</h2>
        <button className="close-button" onClick={onClose}>&times;</button>
      </div>

      <div className="swap-form-content">
        <div className="swap-description">
          Enter the amount for each token you want to swap.
        </div>
        
        <div className="swap-tokens-list">
          {selectedTokens.map(token => (
            <div key={token.address} className="swap-token-item">
              <div className="token-details">
                <div className="token-symbol">{token.symbol}</div>
                <div className="token-balance">Balance: {token.formattedBalance}</div>
              </div>
              
              <div className="token-input-container">
                <input
                  type="text"
                  value={swapAmounts[token.address]?.rawInput || ''}
                  onChange={(e) => handleAmountChange(token, e.target.value)}
                  className={`token-amount-input ${swapAmounts[token.address]?.isValid ? 'valid' : ''}`}
                  placeholder="0.0"
                />
                
                <div className="token-percentage-buttons">
                  <button onClick={() => handlePercentClick(token, 25)}>25%</button>
                  <button onClick={() => handlePercentClick(token, 50)}>50%</button>
                  <button onClick={() => handlePercentClick(token, 75)}>75%</button>
                  <button onClick={() => handlePercentClick(token, 100)}>Max</button>
                </div>
                
                {swapAmounts[token.address]?.isValid && (
                  <div className="token-value">
                    ≈ ${swapAmounts[token.address].valueUsd.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="error-message">{error}</div>
        )}

        <div className="swap-summary">
          <div className="summary-row">
            <span className="summary-label">Total Value:</span>
            <span className="summary-value">${totalValueUsd.toFixed(2)}</span>
          </div>
          
          <div className="summary-row">
            <span className="summary-label">Target Token:</span>
            <div className="target-token-select">
              <select
                value={targetToken.address}
                onChange={handleTargetTokenChange}
                className="token-select"
              >
                {isLoadingTokens ? (
                  <option value="">Loading tokens...</option>
                ) : (
                  availableTokens.map(token => (
                    <option key={token.address} value={token.address}>
                      {token.symbol}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
          
          <div className="summary-row">
            <span className="summary-label">Estimated Output:</span>
            <span className="summary-value">
              {estimatedOutput.toFixed(4)} {targetToken.symbol}
            </span>
          </div>
        </div>

        <div className="swap-actions">
          <button 
            className="swap-button"
            onClick={handleSwap}
            disabled={!isValid}
          >
            {safeMode ? 'Prepare Safe Transaction' : 'Swap'}
          </button>
          <button 
            className="cancel-button"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default SwapForm;