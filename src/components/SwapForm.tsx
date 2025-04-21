import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  Chip,
  Grid,
  Stack,
  CircularProgress,
  Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { ethers } from 'ethers';

import { Token, TokenAmount, SwapBundle } from '../types';
import berabundlerService from '../services/BerabundlerService';
import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk';

interface SwapFormProps {
  selectedTokens: TokenAmount[];
  availableTokens: Token[];
  onRemoveToken: (tokenAddress: string) => void;
  onSwap: (swapBundle: SwapBundle) => void;
  apiKey: string | null;
}

const SwapForm: React.FC<SwapFormProps> = ({ 
  selectedTokens, 
  availableTokens, 
  onRemoveToken, 
  onSwap,
  apiKey
}) => {
  const { sdk, safe } = useSafeAppsSDK();
  const [targetToken, setTargetToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swapQuote, setSwapQuote] = useState<{
    totalValueUsd: number;
    estimatedOutput: string;
    slippage: number;
  } | null>(null);

  // Set default target token to BERA if available
  useEffect(() => {
    if (!targetToken && availableTokens.length > 0) {
      const beraToken = availableTokens.find(t => t.symbol === 'BERA' || t.isNative);
      if (beraToken) {
        setTargetToken(beraToken);
      } else {
        setTargetToken(availableTokens[0]);
      }
    }
  }, [availableTokens, targetToken]);

  // Initialize berabundler service
  useEffect(() => {
    if (sdk && safe) {
      berabundlerService.initialize(sdk, safe.chainId, apiKey || undefined);
    }
  }, [sdk, safe, apiKey]);

  // Validate input tokens and generate swap quote
  const generateSwapQuote = async () => {
    if (!targetToken) {
      setError('Please select a target token');
      return;
    }

    if (selectedTokens.length === 0) {
      setError('Please select at least one token to swap');
      return;
    }

    if (!berabundlerService.isInitialized()) {
      setError('Service not initialized');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Generate swap quote
      const result = await berabundlerService.prepareBundleTransactions(
        selectedTokens,
        targetToken,
        0.5 // 0.5% slippage tolerance
      );

      if (result.success && result.txs) {
        setSwapQuote({
          totalValueUsd: result.totalValueUsd || 0,
          estimatedOutput: result.estimatedOutput || '0',
          slippage: 0.5 // Default slippage percentage
        });
      } else {
        setError(result.error || 'Failed to generate swap quote');
        setSwapQuote(null);
      }
    } catch (err: any) {
      console.error('Error generating swap quote:', err);
      setError(err.message || 'Unknown error generating swap quote');
      setSwapQuote(null);
    } finally {
      setLoading(false);
    }
  };

  // Effect to regenerate quote when tokens change
  useEffect(() => {
    if (selectedTokens.length > 0 && targetToken) {
      generateSwapQuote();
    } else {
      setSwapQuote(null);
    }
  }, [selectedTokens, targetToken]);

  // Handle target token change
  const handleTargetTokenChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const tokenAddress = event.target.value as string;
    const selected = availableTokens.find(token => token.address === tokenAddress);
    if (selected) {
      setTargetToken(selected);
    }
  };

  // Execute the swap via Safe
  const handleSwap = async () => {
    if (!targetToken || selectedTokens.length === 0 || !swapQuote) {
      setError('Cannot execute swap without a valid quote');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await berabundlerService.prepareBundleTransactions(
        selectedTokens,
        targetToken
      );

      if (result.success && result.txs) {
        // Create swap bundle for onSwap callback
        const swapBundle: SwapBundle = {
          operations: [], // These are handled internally by the service
          targetToken,
          totalValueUsd: swapQuote.totalValueUsd,
          estimatedOutput: parseFloat(swapQuote.estimatedOutput)
        };

        // Execute the transaction via Safe
        await sdk.txs.send({ txs: result.txs });
        
        // Notify parent component
        onSwap(swapBundle);
        
        // Reset state
        setSwapQuote(null);
      } else {
        setError(result.error || 'Failed to prepare transactions');
      }
    } catch (err: any) {
      console.error('Swap execution failed:', err);
      setError(err.message || 'Unknown error executing swap');
    } finally {
      setLoading(false);
    }
  };

  // Don't show the form if no tokens are selected
  if (selectedTokens.length === 0) {
    return null;
  }

  return (
    <Box mb={4}>
      <Typography variant="h6" gutterBottom>
        Bundle Swap
      </Typography>
      

      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Selected Tokens to Swap
        </Typography>
        
        <List>
          {selectedTokens.map(({ token, amount }) => (
            <ListItem key={token.address} divider>
              <ListItemAvatar>
                <Avatar src={token.logoURI} alt={token.symbol}>
                  {token.symbol.charAt(0)}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={token.symbol}
                secondary={
                  <Box>
                    <Typography variant="body2" component="span">
                      {amount} {token.symbol}
                    </Typography>
                    {token.priceUsd && (
                      <Typography variant="body2" component="span" color="textSecondary" sx={{ ml: 1 }}>
                        (${(parseFloat(amount) * token.priceUsd).toFixed(2)})
                      </Typography>
                    )}
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <IconButton 
                  edge="end" 
                  aria-label="delete"
                  onClick={() => onRemoveToken(token.address)}
                >
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>

        <Box mt={3}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined">
                <InputLabel id="target-token-label">Target Token</InputLabel>
                <Select
                  labelId="target-token-label"
                  id="target-token-select"
                  value={targetToken?.address || ''}
                  onChange={handleTargetTokenChange as any}
                  label="Target Token"
                >
                  {availableTokens.map(token => (
                    <MenuItem key={token.address} value={token.address}>
                      <Box display="flex" alignItems="center">
                        <Avatar 
                          src={token.logoURI} 
                          sx={{ width: 24, height: 24, mr: 1 }}
                        >
                          {token.symbol.charAt(0)}
                        </Avatar>
                        <span>{token.symbol}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Box display="flex" justifyContent="center">
                <SwapVertIcon fontSize="large" color="primary" />
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Swap Quote Section */}
        {swapQuote && (
          <Box mt={3} p={2} bgcolor="rgba(18, 255, 128, 0.05)" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom>
              Swap Summary
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Total Value:
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" align="right">
                  ${swapQuote.totalValueUsd.toFixed(2)}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Estimated Output:
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" align="right">
                  {parseFloat(swapQuote.estimatedOutput).toFixed(6)} {targetToken?.symbol}
                </Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Slippage Tolerance:
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" align="right">
                  {swapQuote.slippage}%
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Box mt={3} display="flex" justifyContent="center">
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={handleSwap}
            disabled={loading || !swapQuote}
            startIcon={loading ? <CircularProgress size={20} /> : undefined}
          >
            {loading ? 'Processing...' : 'Execute Swap Bundle'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default SwapForm;