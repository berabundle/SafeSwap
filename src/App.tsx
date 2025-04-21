import React, { useEffect, useState, useMemo } from 'react';
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
  
  // Create provider for blockchain interaction
  const provider = useMemo(() => {
    const safeProvider = new SafeAppProvider(safe, sdk);
    return new ethers.BrowserProvider(safeProvider);
  }, [sdk, safe]);

  useEffect(() => {
    const loadTokens = async () => {
      try {
        setLoading(true);
        // 1. Fetch token list
        const tokenList = await fetchTokenList();
        
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
        
        // 4. Fetch prices for tokens
        const tokensWithPrices = await fetchTokenPrices(tokensWithBalances);
        
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
    };

    loadTokens();
  }, [safe.chainId, safe.safeAddress, provider]);

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

    try {
      // We'll implement the actual swap logic in the next step
      console.log('Swap bundle:', swapBundle);
      
      // For now, just show a success message
      // Reset selected tokens after successful swap
      setSelectedTokens([]);
      setError(null);
    } catch (err) {
      console.error('Swap failed:', err);
      setError('Failed to execute swap');
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
          
          <SwapForm
            selectedTokens={selectedTokens}
            onRemoveToken={handleRemoveToken}
            onSwap={handleSwap}
            availableTokens={tokens}
          />
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default App;