/**
 * @file TokenMetadataService.js
 * @description Service for fetching token metadata
 * 
 * This service is used to fetch token metadata from the API
 * or from a GitHub repository as a fallback.
 */

/**
 * Service for fetching token metadata from multiple sources
 */
class TokenMetadataService {
  constructor() {
    this.apiBaseUrl = 'https://mainnet.api.oogabooga.io/v1';
    this.githubUrl = 'https://raw.githubusercontent.com/oogabooga-io/berachain-token-metadata/main/tokens.json';
    this.cacheTimeMs = 10 * 60 * 1000; // 10 minute cache
    this.tokenCache = {
      timestamp: 0,
      data: null
    };
  }
  
  /**
   * Checks if the cache is valid
   * @returns {boolean} Whether the cache is valid
   */
  isCacheValid() {
    return this.tokenCache.data && 
           Date.now() - this.tokenCache.timestamp < this.cacheTimeMs;
  }
  
  /**
   * Fetches token metadata from the API
   * @returns {Promise<Object>} Token data result object
   */
  async getOogaBoogaTokens() {
    try {
      // Check cache first
      if (this.isCacheValid()) {
        return { 
          success: true, 
          tokens: this.tokenCache.data,
          cached: true
        };
      }
      
      const response = await fetch(`${this.apiBaseUrl}/tokens`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API returned status: ${response.status}`);
      }
      
      const tokensData = await response.json();
      
      // Update cache
      this.tokenCache = {
        timestamp: Date.now(),
        data: tokensData
      };
      
      return { success: true, tokens: tokensData };
    } catch (error) {
      console.error("Error fetching API tokens:", error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Fallback method to fetch token metadata from GitHub
   * @returns {Promise<Object>} Token data result object
   */
  async getGitHubTokens() {
    try {
      const response = await fetch(this.githubUrl);
      if (!response.ok) {
        throw new Error(`GitHub API returned status: ${response.status}`);
      }
      
      const tokensData = await response.json();
      return { success: true, tokens: tokensData };
    } catch (error) {
      console.error("Error fetching GitHub tokens:", error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Gets token metadata with fallback options
   * @returns {Promise<Object>} Combined metadata result
   */
  async getTokenMetadata() {
    // Try primary source first
    const primaryResult = await this.getOogaBoogaTokens();
    
    if (primaryResult.success && 
        primaryResult.tokens && 
        primaryResult.tokens.data) {
      return primaryResult;
    }
    
    // Fall back to GitHub source
    const fallbackResult = await this.getGitHubTokens();
    
    return fallbackResult;
  }
}

// Export singleton instance
const tokenMetadataService = new TokenMetadataService();
export default tokenMetadataService;