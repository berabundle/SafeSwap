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

const App: React.FC = () => {
  const { sdk, safe } = useSafeAppsSDK();
  const [loading, setLoading] = useState(true);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<TokenAmount[]>([]);
  const [targetToken, setTargetToken] = useState<Token | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  
  // Create provider for blockchain interaction
  const provider = useMemo(() => {
    const safeProvider = new SafeAppProvider(safe, sdk);
    return new ethers.BrowserProvider(safeProvider);
  }, [sdk, safe]);

  // Update tokens when API key changes
  const loadTokens = useCallback(async () => {
    try {
      setLoading(true);
      // 1. Fetch token list with API key
      const tokenList = await fetchTokenList(apiKey);
      
      // 2. Filter tokens for the current chain
      const filteredTokens = tokenList.tokens.filter(
        token => token.chainId === safe.chainId
      );
      
      // 3. Fetch balances for these tokens
      const tokensWithBalances = await fetchTokenBalances(
        filteredTokens, 
        safe.safeAddress, 
        provider
      );
      
      // 4. Fetch prices for tokens with API key
      const tokensWithPrices = await fetchTokenPrices(tokensWithBalances, apiKey);
      
      setTokens(tokensWithPrices);
      
      // Set BERA as default target token
      const beraToken = tokensWithPrices.find(t => t.symbol === 'BERA');
      if (beraToken) {
        setTargetToken(beraToken);
      }
      
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

  const handleTokenSelection = (token: Token, amount: string, isMax: boolean) => {
    setSelectedTokens(prev => {
      // Check if token is already selected
      const existingIndex = prev.findIndex(item => item.token.address === token.address);
      
      if (existingIndex >= 0) {
        // Update existing token
        const updated = [...prev];
        updated[existingIndex] = { token, amount, isMax };
        return updated;
      } else {
        // Add new token
        return [...prev, { token, amount, isMax }];
      }
    });
  };

  const handleRemoveToken = (tokenAddress: string) => {
    setSelectedTokens(prev => prev.filter(item => item.token.address !== tokenAddress));
  };

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
      // We'll reload tokens after successful swap to update balances
      setLoading(true);
      
      // The actual swap logic is handled in the SwapForm component
      // and the Safe SDK will prompt the user to confirm the transaction
      console.log('Swap bundle executed:', swapBundle);
      
      // Reset selected tokens after successful swap
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
          
          <TokenSelector 
            tokens={tokens} 
            onSelect={handleTokenSelection}
            selectedTokens={selectedTokens}
          />
          
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