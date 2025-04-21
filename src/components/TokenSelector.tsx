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
  Dialog,
  DialogTitle,
  DialogContent,
  InputAdornment,
  IconButton,
  Divider,
  FormControlLabel,
  Switch
} from '@mui/material';
import { Search as SearchIcon, Close as CloseIcon } from '@mui/icons-material';
import { ethers } from 'ethers';

import { Token, TokenAmount } from '../types';

interface TokenSelectorProps {
  tokens: Token[];
  selectedTokens: TokenAmount[];
  onSelect: (token: Token, amount: string, isMax: boolean) => void;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({ tokens, selectedTokens, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState('');
  const [isMax, setIsMax] = useState(false);
  
  // State to control showing zero balances
  const [showZeroBalances, setShowZeroBalances] = useState(false);
  
  // Filter tokens based on search term and balance
  const filteredTokens = useMemo(() => {
    return tokens.filter(token => {
      const nameOrSymbolMatch = 
        token.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        token.symbol.toLowerCase().includes(searchTerm.toLowerCase());
      
      // If we're not showing zero balances, check the balance
      if (!showZeroBalances) {
        const balance = token.balance || '0';
        const hasNonZeroBalance = parseFloat(balance) > 0;
        return nameOrSymbolMatch && hasNonZeroBalance;
      }
      
      return nameOrSymbolMatch;
    });
  }, [tokens, searchTerm, showZeroBalances]);

  const handleTokenClick = (token: Token) => {
    setSelectedToken(token);
    setAmount('');
    setIsMax(false);
    setDialogOpen(true);
  };

  const handleMaxClick = () => {
    if (!selectedToken) return;
    
    const balance = selectedToken.balance || '0';
    setAmount(balance);
    setIsMax(true);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
    setIsMax(false);
  };

  const handleAddToken = () => {
    if (selectedToken && amount) {
      onSelect(selectedToken, amount, isMax);
      setDialogOpen(false);
    }
  };

  // Format token amount for display
  const formatTokenAmount = (amount: string, decimals: number): string => {
    try {
      const parsed = ethers.formatUnits(amount, decimals);
      // Trim trailing zeros and decimal point if needed
      return parsed.replace(/\.?0+$/, '');
    } catch (error) {
      return amount;
    }
  };

  return (
    <Box mb={4}>
      <Typography variant="h6" gutterBottom>
        Select Tokens to Swap
      </Typography>
      
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
      
      <Paper variant="outlined" sx={{ mt: 2, maxHeight: 300, overflow: 'auto' }}>
        <List>
          {filteredTokens.map((token) => {
            const balance = token.balance || '0';
            
            // Display token price if available
            const priceDisplay = token.priceUsd 
              ? `$${token.priceUsd.toFixed(2)}`
              : '';
              
            const isSelected = selectedTokens.some(
              item => item.token.address === token.address
            );
            
            return (
              <ListItem 
                button 
                key={token.address}
                onClick={() => handleTokenClick(token)}
                disabled={isSelected}
                divider
              >
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
                  secondary={token.name}
                />
                <Typography variant="body2" color="textSecondary">
                  {balance}
                </Typography>
              </ListItem>
            );
          })}
          
          {filteredTokens.length === 0 && (
            <ListItem>
              <ListItemText primary="No tokens found" />
            </ListItem>
          )}
        </List>
      </Paper>
      
      {/* Token Amount Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            {selectedToken?.symbol} Amount
            <IconButton onClick={() => setDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <Divider />
        <DialogContent>
          {selectedToken && (
            <Box>
              <Box display="flex" alignItems="center" mb={2}>
                <Avatar src={selectedToken.logoURI} sx={{ mr: 1 }}>
                  {selectedToken.symbol.charAt(0)}
                </Avatar>
                <Typography>{selectedToken.name}</Typography>
              </Box>
              
              <Box mb={2}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Balance: {selectedToken.balance || '0'}
                </Typography>
                {selectedToken.priceUsd && (
                  <Typography variant="body2" color="textSecondary">
                    Price: ${selectedToken.priceUsd.toFixed(4)}
                  </Typography>
                )}
              </Box>
              
              <TextField
                label="Amount"
                fullWidth
                type="number"
                value={amount}
                onChange={handleAmountChange}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Typography 
                        color="primary" 
                        sx={{ cursor: 'pointer' }}
                        onClick={handleMaxClick}
                      >
                        MAX
                      </Typography>
                    </InputAdornment>
                  ),
                }}
                variant="outlined"
                margin="normal"
              />
              
              {/* Display USD value if price is available */}
              {selectedToken.priceUsd && amount && (
                <Typography variant="body2" color="textSecondary" align="right">
                  ≈ ${(parseFloat(amount) * selectedToken.priceUsd).toFixed(2)} USD
                </Typography>
              )}
              
              <Box 
                display="flex" 
                justifyContent="space-between" 
                mt={3}
              >
                <Typography 
                  variant="button" 
                  sx={{ cursor: 'pointer' }}
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Typography>
                <Typography 
                  variant="button" 
                  color="primary"
                  sx={{ cursor: 'pointer' }}
                  onClick={handleAddToken}
                >
                  Add Token
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default TokenSelector;