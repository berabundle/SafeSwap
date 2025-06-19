/**
 * TokenSelector Component - Allows users to select tokens and amounts for swapping
 * 
 * Features:
 * - Search tokens by name or symbol
 * - Toggle to show/hide zero balance tokens
 * - Inline amount input with MAX button
 * - Real-time USD value calculation
 * - Disabled state for already selected tokens
 */

import React, { useState, useMemo } from 'react';
import { 
  Paper, 
  TextField, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Avatar, 
  Typography, 
  Box,
  InputAdornment,
  FormControlLabel,
  Switch,
  Grid,
  Button
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';

import { Token, TokenAmount } from '../types';

interface TokenSelectorProps {
  tokens: Token[];
  selectedTokens: TokenAmount[];
  onSelect: (token: Token, amount: string, isMax: boolean) => void;
}

/**
 * Component for selecting tokens and specifying swap amounts
 */
const TokenSelector: React.FC<TokenSelectorProps> = ({ tokens, selectedTokens, onSelect }) => {
  // Component state
  const [searchTerm, setSearchTerm] = useState('');
  const [showZeroBalances, setShowZeroBalances] = useState(false);
  const [tokenAmounts, setTokenAmounts] = useState<{[key: string]: string}>({});
  
  /**
   * Filter tokens based on search term and balance
   */
  const filteredTokens = useMemo(() => {
    return tokens.filter(token => {
      // Check name/symbol match
      const matchesSearch = 
        token.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        token.symbol.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter zero balances if toggle is off
      if (!showZeroBalances) {
        const balance = token.balance || '0';
        const hasNonZeroBalance = parseFloat(balance) > 0;
        return matchesSearch && hasNonZeroBalance;
      }
      
      return matchesSearch;
    });
  }, [tokens, searchTerm, showZeroBalances]);

  /**
   * Update amount for a specific token
   */
  const handleAmountChange = (tokenAddress: string, value: string) => {
    setTokenAmounts(prev => ({
      ...prev,
      [tokenAddress]: value
    }));
  };

  /**
   * Set max amount for a token
   */
  const handleMaxClick = (token: Token) => {
    const balance = token.balance || '0';
    handleAmountChange(token.address, balance);
  };

  /**
   * Add token to selected list
   */
  const handleAddToken = (token: Token) => {
    const amount = tokenAmounts[token.address] || '';
    if (amount && parseFloat(amount) > 0) {
      const isMax = amount === token.balance;
      onSelect(token, amount, isMax);
      // Clear amount after adding
      setTokenAmounts(prev => ({
        ...prev,
        [token.address]: ''
      }));
    }
  };

  /**
   * Check if token is already selected
   */
  const isTokenSelected = (tokenAddress: string) => {
    return selectedTokens.some(item => item.token.address === tokenAddress);
  };

  return (
    <Box mb={4}>
      <Typography variant="h6" gutterBottom>
        Select Tokens to Swap
      </Typography>
      
      {/* Search input */}
      <TextField
        fullWidth
        placeholder="Search tokens..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        margin="normal"
        variant="outlined"
      />
      
      {/* Zero balance toggle */}
      <Box display="flex" justifyContent="flex-end" mt={1}>
        <FormControlLabel
          control={
            <Switch
              checked={showZeroBalances}
              onChange={(e) => setShowZeroBalances(e.target.checked)}
              color="primary"
              size="small"
            />
          }
          label={
            <Typography variant="body2" color="textSecondary">
              Show zero balances
            </Typography>
          }
        />
      </Box>
      
      {/* Token list */}
      <Paper variant="outlined" sx={{ mt: 2, maxHeight: 400, overflow: 'auto' }}>
        <List>
          {filteredTokens.map((token) => {
            const balance = token.balance || '0';
            const priceDisplay = token.priceUsd 
              ? `$${token.priceUsd.toFixed(2)}`
              : '';
            const isSelected = isTokenSelected(token.address);
            const amount = tokenAmounts[token.address] || '';
            
            return (
              <ListItem 
                key={token.address}
                divider
                sx={{ opacity: isSelected ? 0.5 : 1 }}
              >
                {/* Token avatar and info */}
                <ListItemAvatar>
                  <Avatar src={token.logoURI} alt={token.symbol}>
                    {token.symbol.charAt(0)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText 
                  primary={
                    <Box display="flex" justifyContent="space-between">
                      <span>{token.symbol}</span>
                      {priceDisplay && <span>{priceDisplay}</span>}
                    </Box>
                  } 
                  secondary={
                    <Box>
                      <Typography variant="caption">{token.name}</Typography>
                      <Typography variant="caption" display="block">
                        Balance: {balance}
                      </Typography>
                    </Box>
                  }
                />
                
                {/* Amount input and add button */}
                <Box sx={{ minWidth: 200, ml: 2 }}>
                  <Grid container spacing={1} alignItems="center">
                    <Grid item xs={8}>
                      <TextField
                        size="small"
                        type="number"
                        placeholder="Amount"
                        value={amount}
                        onChange={(e) => handleAmountChange(token.address, e.target.value)}
                        disabled={isSelected}
                        fullWidth
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <Typography 
                                variant="caption"
                                color="primary" 
                                sx={{ cursor: 'pointer' }}
                                onClick={() => !isSelected && handleMaxClick(token)}
                              >
                                MAX
                              </Typography>
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Grid>
                    <Grid item xs={4}>
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => handleAddToken(token)}
                        disabled={isSelected || !amount || parseFloat(amount) <= 0}
                        fullWidth
                      >
                        Add
                      </Button>
                    </Grid>
                  </Grid>
                  
                  {/* USD value display */}
                  {token.priceUsd && amount && parseFloat(amount) > 0 && (
                    <Typography variant="caption" color="textSecondary">
                      ≈ ${(parseFloat(amount) * token.priceUsd).toFixed(2)}
                    </Typography>
                  )}
                </Box>
              </ListItem>
            );
          })}
          
          {/* Empty state */}
          {filteredTokens.length === 0 && (
            <ListItem>
              <ListItemText primary="No tokens found" />
            </ListItem>
          )}
        </List>
      </Paper>
    </Box>
  );
};

export default TokenSelector;