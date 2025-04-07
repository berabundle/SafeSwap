import React, { useState } from 'react';
import config from '../config';

/**
 * Component for inputting and saving API keys
 * 
 * @param {Object} props Component props
 * @param {function} props.onSave Callback for when API key is saved
 * @param {string} props.savedKey Currently saved API key
 */
function ApiKeyInput({ onSave, savedKey }) {
  const [apiKey, setApiKey] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  
  /**
   * Handle form submission to save the API key
   * @param {Event} e - Form submission event
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onSave(apiKey.trim());
      setApiKey('');
    }
  };
  
  /**
   * Toggle password visibility
   */
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };
  
  return (
    <div className="api-key-input">
      <h3>API Key Required</h3>
      <p>
        An API key is required to fetch token prices and swap data.
        {savedKey && ' You have already set an API key.'}
      </p>
      
      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <input
            type={isVisible ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key"
            className="api-key-field"
            autoComplete="off"
            aria-label="API Key"
          />
          <button 
            type="button" 
            onClick={toggleVisibility}
            className="toggle-visibility"
            aria-label={isVisible ? "Hide API key" : "Show API key"}
          >
            {isVisible ? 'Hide' : 'Show'}
          </button>
        </div>
        
        <button 
          type="submit" 
          disabled={!apiKey.trim()}
          className="save-button"
        >
          Save API Key
        </button>
      </form>
      
      {savedKey && (
        <div className="key-status">
          <p>Status: ✅ API key is set</p>
        </div>
      )}
    </div>
  );
}

export default ApiKeyInput;