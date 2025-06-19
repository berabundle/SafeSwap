/**
 * SafeSwap App - Main application component
 * 
 * This is a Safe App that allows users to:
 * - Select multiple tokens from their Safe
 * - Bundle swaps into a single transaction
 * - Execute swaps through the Berabundle contract
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Box, Typography, CircularProgress } from '@mui/material';
import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk';
import { SafeAppProvider } from '@safe-global/safe-apps-provider';
import { ethers } from 'ethers';

import TokenSelector from './components/TokenSelector';
import SwapForm from './components/SwapForm';
import { fetchTokenList, fetchTokenBalances, fetchTokenPrices } from './services/tokenService';
import { Token, TokenAmount, SwapBundle } from './types';

// Dark theme configuration for Safe Apps
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#12FF80',
    },
    secondary: {
      main: '#303030',
    },
  },
});

/**
 * Main App component
 * Manages global state and coordinates between token selection and swap execution
 */
const App: React.FC = () => {
  // Safe SDK hooks
  const { sdk, safe } = useSafeAppsSDK();
  
  // Application state
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<TokenAmount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  
  // Create ethers provider using Safe SDK
  const provider = useMemo(() => {
    const safeProvider = new SafeAppProvider(safe, sdk);
    return new ethers.BrowserProvider(safeProvider);
  }, [sdk, safe]);

  /**
   * Load tokens from OogaBooga API and fetch balances/prices
   */
  const loadTokens = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch token list from API
      const tokenList = await fetchTokenList(apiKey);
      
      // Filter for current chain
      const filteredTokens = tokenList.tokens.filter(
        token => token.chainId === safe.chainId
      );
      
      // Get on-chain balances
      const tokensWithBalances = await fetchTokenBalances(
        filteredTokens, 
        safe.safeAddress, 
        provider
      );
      
      // Get current prices
      const tokensWithPrices = await fetchTokenPrices(tokensWithBalances, apiKey);
      
      setTokens(tokensWithPrices);
      setError(null);
    } catch (err) {
      setError('Failed to load tokens. Please refresh the page.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [safe.chainId, safe.safeAddress, provider, apiKey]);

  // Load tokens when dependencies change
  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  /**
   * Handle token selection from TokenSelector component
   */
  const handleTokenSelection = (token: Token, amount: string, isMax: boolean) => {
    setSelectedTokens(prev => {
      const existingIndex = prev.findIndex(item => item.token.address === token.address);
      
      if (existingIndex >= 0) {
        // Update existing token amount
        const updated = [...prev];
        updated[existingIndex] = { token, amount, isMax };
        return updated;
      } else {
        // Add new token
        return [...prev, { token, amount, isMax }];
      }
    });
  };

  /**
   * Remove token from selected list
   */
  const handleRemoveToken = (tokenAddress: string) => {
    setSelectedTokens(prev => prev.filter(item => item.token.address !== tokenAddress));
  };

  /**
   * Handle swap execution
   */
  const handleSwap = async (swapBundle: SwapBundle) => {
    if (selectedTokens.length === 0) {
      setError('Please select at least one token to swap');
      return;
    }

    if (!apiKey) {
      setError('Please enter your OogaBooga API key to perform swaps');
      return;
    }

    try {
      setLoading(true);
      console.log('Swap bundle executed:', swapBundle);
      
      // Clear selected tokens after successful swap
      setSelectedTokens([]);
      setError(null);
      
      // Reload tokens to update balances
      await loadTokens();
    } catch (err: any) {
      console.error('Swap failed:', err);
      setError(`Failed to execute swap: ${err.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner
  if (loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md">
        <Box my={4}>
          <Typography variant="h4" component="h1" gutterBottom>
            SafeSwap
          </Typography>
          
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
          
          {/* Token selection component */}
          <TokenSelector 
            tokens={tokens} 
            onSelect={handleTokenSelection}
            selectedTokens={selectedTokens}
          />
          
          {/* API key input */}
          <Box mb={3}>
            <Typography variant="subtitle1" gutterBottom>
              OogaBooga API Key
            </Typography>
            <input
              type="password"
              value={apiKey || ''}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid #444',
                background: 'transparent',
                color: 'white',
                marginBottom: '10px'
              }}
            />
            <Typography variant="caption" color="textSecondary">
              Your API key is required for fetching token prices and executing swaps. Keys are not stored.
            </Typography>
          </Box>
          
          {/* Swap execution component */}
          <SwapForm
            selectedTokens={selectedTokens}
            onRemoveToken={handleRemoveToken}
            onSwap={handleSwap}
            availableTokens={tokens}
            apiKey={apiKey}
          />
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default App;