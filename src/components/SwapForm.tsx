/**
 * SwapForm Component - Handles swap execution and displays swap details
 * 
 * Features:
 * - Shows selected tokens with amounts and USD values
 * - Dropdown selection for output token
 * - Real-time swap quote generation
 * - Safe transaction execution
 * - Loading states and error handling
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

import { Token, TokenAmount, SwapBundle } from '../types';
import swapBundleService from '../services/SwapBundleService';
import { useSafeAppsSDK } from '@safe-global/safe-apps-react-sdk';

interface SwapFormProps {
  selectedTokens: TokenAmount[];
  availableTokens: Token[];
  onRemoveToken: (tokenAddress: string) => void;
  onSwap: (swapBundle: SwapBundle) => void;
  apiKey: string | null;
}

/**
 * Component for executing token swaps through Safe
 */
const SwapForm: React.FC<SwapFormProps> = ({ 
  selectedTokens, 
  availableTokens, 
  onRemoveToken, 
  onSwap,
  apiKey
}) => {
  // Safe SDK hook
  const { sdk, safe } = useSafeAppsSDK();
  
  // Component state
  const [targetToken, setTargetToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swapQuote, setSwapQuote] = useState<{
    totalValueUsd: number;
    estimatedOutput: string;
    slippage: number;
  } | null>(null);

  /**
   * Set default target token (BERA)
   */
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

  /**
   * Initialize swap bundle service
   */
  useEffect(() => {
    if (sdk && safe) {
      swapBundleService.initialize(sdk, safe.chainId, apiKey || undefined);
    }
  }, [sdk, safe, apiKey]);

  /**
   * Generate swap quote from API
   */
  const generateSwapQuote = useCallback(async () => {
    if (!targetToken || selectedTokens.length === 0 || !swapBundleService.isInitialized()) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await swapBundleService.prepareBundleTransactions(
        selectedTokens,
        targetToken,
        safe.safeAddress,
        0.5 // 0.5% slippage
      );

      if (result.success && result.txs) {
        setSwapQuote({
          totalValueUsd: result.totalValueUsd || 0,
          estimatedOutput: result.estimatedOutput || '0',
          slippage: 0.5
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
  }, [selectedTokens, targetToken, safe.safeAddress]);

  /**
   * Regenerate quote when inputs change
   */
  useEffect(() => {
    if (selectedTokens.length > 0 && targetToken && apiKey) {
      generateSwapQuote();
    } else {
      setSwapQuote(null);
    }
  }, [selectedTokens, targetToken, apiKey, generateSwapQuote]);

  /**
   * Handle target token selection
   */
  const handleTargetTokenChange = (event: any) => {
    const tokenAddress = event.target.value as string;
    const selected = availableTokens.find(token => token.address === tokenAddress);
    if (selected) {
      setTargetToken(selected);
    }
  };

  /**
   * Execute swap through Safe
   */
  const handleSwap = async () => {
    if (!targetToken || selectedTokens.length === 0 || !swapQuote) {
      setError('Cannot execute swap without a valid quote');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get final transaction data
      const result = await swapBundleService.prepareBundleTransactions(
        selectedTokens,
        targetToken,
        safe.safeAddress
      );

      if (result.success && result.txs) {
        // Create swap bundle for callback
        const swapBundle: SwapBundle = {
          targetToken,
          totalValueUsd: swapQuote.totalValueUsd,
          estimatedOutput: parseFloat(swapQuote.estimatedOutput)
        };

        // Send transaction through Safe SDK
        await sdk.txs.send({ txs: result.txs });
        
        // Notify parent component
        onSwap(swapBundle);
        
        // Clear quote
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

  /**
   * Calculate total input value in USD
   */
  const totalInputValue = selectedTokens.reduce((sum, { token, amount }) => {
    if (token.priceUsd) {
      return sum + (parseFloat(amount) * token.priceUsd);
    }
    return sum;
  }, 0);

  // Don't render if no tokens selected
  if (selectedTokens.length === 0) {
    return null;
  }

  return (
    <Box mb={4}>
      <Typography variant="h6" gutterBottom>
        Swap Bundle
      </Typography>

      <Paper variant="outlined" sx={{ p: 2 }}>
        {/* Input tokens section */}
        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>
            Input Tokens ({selectedTokens.length})
          </Typography>
          
          <List dense>
            {selectedTokens.map(({ token, amount }) => (
              <ListItem key={token.address}>
                <ListItemAvatar>
                  <Avatar src={token.logoURI} alt={token.symbol} sx={{ width: 32, height: 32 }}>
                    {token.symbol.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${amount} ${token.symbol}`}
                  secondary={token.priceUsd ? `$${(parseFloat(amount) * token.priceUsd).toFixed(2)}` : null}
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    size="small"
                    onClick={() => onRemoveToken(token.address)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          
          {/* Total input value */}
          {totalInputValue > 0 && (
            <Typography variant="body2" color="textSecondary" align="right">
              Total Input: ${totalInputValue.toFixed(2)}
            </Typography>
          )}
        </Box>

        {/* Swap arrow */}
        <Box display="flex" justifyContent="center" my={2}>
          <SwapHorizIcon color="primary" />
        </Box>

        {/* Output token selector */}
        <Box mb={3}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="target-token-label">Output Token</InputLabel>
            <Select
              labelId="target-token-label"
              value={targetToken?.address || ''}
              onChange={handleTargetTokenChange}
              label="Output Token"
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
        </Box>

        {/* Swap quote display */}
        {swapQuote && (
          <Box mb={3} p={2} bgcolor="rgba(18, 255, 128, 0.05)" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom>
              Estimated Output
            </Typography>
            <Typography variant="h6">
              {parseFloat(swapQuote.estimatedOutput).toFixed(6)} {targetToken?.symbol}
            </Typography>
            {targetToken?.priceUsd && (
              <Typography variant="body2" color="textSecondary">
                ≈ ${(parseFloat(swapQuote.estimatedOutput) * targetToken.priceUsd).toFixed(2)}
              </Typography>
            )}
            <Typography variant="caption" color="textSecondary" display="block" mt={1}>
              Slippage: {swapQuote.slippage}%
            </Typography>
          </Box>
        )}

        {/* Error display */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Execute button */}
        <Button
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          onClick={handleSwap}
          disabled={loading || !swapQuote || !apiKey}
          startIcon={loading ? <CircularProgress size={20} /> : <SwapHorizIcon />}
        >
          {loading ? 'Processing...' : 'Execute Swap'}
        </Button>
        
        {/* API key warning */}
        {!apiKey && (
          <Typography variant="caption" color="error" display="block" mt={1} textAlign="center">
            Please enter your API key above
          </Typography>
        )}
      </Paper>
    </Box>
  );
};

export default SwapForm;