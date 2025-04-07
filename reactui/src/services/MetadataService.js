/**
 * MetadataService.js - Service for fetching token metadata
 * 
 * This service is used to fetch token metadata from the OogaBooga API
 * or from a GitHub repository.
 */

/**
 * Service for fetching token metadata
 */
class MetadataService {
  constructor() {
    this.githubUrl = 'https://raw.githubusercontent.com/oogabooga-io/berachain-token-metadata/main/tokens.json';
  }
  
  /**
   * Fetches token metadata from OogaBooga API
   * 
   * @returns {Promise<Object>} Token data from OogaBooga API
   */
  async getOogaBoogaTokens() {
    try {
      // URL is static for demo purposes
      const response = await fetch('https://mainnet.api.oogabooga.io/v1/tokens', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        return { success: false, error: 'Failed to fetch OogaBooga tokens' };
      }
      
      const tokensData = await response.json();
      return { success: true, tokens: tokensData };
    } catch (error) {
      console.error("Error fetching OogaBooga tokens:", error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Fallback method to fetch token metadata from GitHub
   * 
   * @returns {Promise<Object>} Token data from GitHub
   */
  async getGitHubTokens() {
    try {
      const response = await fetch(this.githubUrl);
      if (!response.ok) {
        return { success: false, error: 'Failed to fetch GitHub tokens' };
      }
      
      const tokensData = await response.json();
      return { success: true, tokens: tokensData };
    } catch (error) {
      console.error("Error fetching GitHub tokens:", error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const metadataService = new MetadataService();
export default metadataService;