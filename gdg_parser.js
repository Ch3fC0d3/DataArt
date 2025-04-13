/**
 * GDELT Project GDG Parser
 * This file contains functions to parse and process GDELT Project Government Document Graph data
 */

class GDGParser {
  constructor() {
    this.processedEntries = [];
    this.maxEntries = 100;
    this.entryCount = 0;
  }
  
  /**
   * Process raw GDELT data into a format usable by our visualization
   * @param {Object} data - The GDELT API response
   * @returns {Object} Processed data with entries array
   */
  parseGDGData(data) {
    console.log("Parsing GDELT data...");
    
    try {
      // Check if we have articles
      if (!data || !data.articles || !Array.isArray(data.articles)) {
        console.warn("No articles found in GDELT data");
        return this.getSampleData();
      }
      
      console.log(`Found ${data.articles.length} articles in the feed`);
      
      // Process each article
      for (let i = 0; i < data.articles.length && this.processedEntries.length < this.maxEntries; i++) {
        const article = data.articles[i];
        
        // Create a formatted entry
        const formattedEntry = {
          source: this.extractSource(article),
          changes: []
        };
        
        // Extract text content
        let originalText = this.extractTextContent(article);
        
        if (originalText) {
          // Create redacted version
          const redactedText = this.createRedactedVersion(originalText);
          
          // Add the change
          formattedEntry.changes.push({
            from: originalText,
            to: redactedText,
            type: 'text'
          });
          
          // Add the entry if it has valid changes
          if (formattedEntry.changes.length > 0) {
            this.addEntry(formattedEntry);
          }
        }
      }
      
      console.log(`Successfully processed ${this.processedEntries.length} entries`);
      return {
        entries: this.processedEntries
      };
      
    } catch (error) {
      console.error("Error parsing GDELT data:", error);
      return this.getSampleData();
    }
  }
  
  /**
   * Extract source information from an article
   * @param {Object} article - The article to extract from
   * @returns {string} The source information
   */
  extractSource(article) {
    // Try to get the most specific source information
    if (article.source) return article.source;
    if (article.url) return this.formatUrl(article.url);
    if (article.domain) return article.domain;
    
    // Default source
    return "News Article";
  }
  
  /**
   * Format a URL to be more readable
   * @param {string} url - The URL to format
   * @returns {string} Formatted URL
   */
  formatUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (e) {
      return url;
    }
  }
  
  /**
   * Extract text content from an article
   * @param {Object} article - The article to extract from
   * @returns {string} Extracted text
   */
  extractTextContent(article) {
    // Try to get text content from various fields
    if (article.title && article.title.length > 10) {
      return article.title;
    }
    if (article.description && article.description.length > 10) {
      return article.description;
    }
    if (article.content && article.content.length > 10) {
      return article.content;
    }
    
    return null;
  }
  
  /**
   * Create a redacted version of text by removing specific details
   * @param {string} text - Original text
   * @returns {string} Redacted version
   */
  createRedactedVersion(text) {
    if (!text) return '';
    
    // Words that should trigger redaction
    const sensitivePatterns = [
      /\b(?:classified|confidential|secret)\b/i,
      /\b(?:casualties|deaths|injured|wounded)\b/i,
      /\b(?:corruption|fraud|misconduct|violation)\b/i,
      /\b(?:investigation|probe|inquiry)\b/i,
      /\b(?:failure|mistake|error|incident)\b/i,
      /\b(?:protest|unrest|riot|demonstration)\b/i,
      /\b(?:intelligence|surveillance|operation)\b/i,
      /\b(?:weapon|military|defense|police|security)\b/i,
      /\b(?:government|official|authority)\b/i,
      /\b(?:city|town|village|district|region)\b/i,
      /\b(?:\d+(?:,\d{3})*(?:\.\d+)?)\b/ // numbers
    ];

    // Split text into words
    let words = text.split(/\s+/);
    
    // Process each word
    words = words.map(word => {
      // Check if word matches any sensitive pattern
      if (sensitivePatterns.some(pattern => pattern.test(word))) {
        // Replace with [REDACTED]
        return '[REDACTED]';
      }
      return word;
    });
    
    return words.join(' ');
  }
  
  /**
   * Add an entry to the processed entries array
   * @param {Object} entry - The entry to add
   */
  addEntry(entry) {
    if (this.processedEntries.length < this.maxEntries) {
      // Make sure the entry has valid changes
      if (entry.changes && entry.changes.length > 0) {
        // Filter out any changes with empty text
        entry.changes = entry.changes.filter(ch => 
          ch.from && ch.from.trim().length > 0 && 
          ch.to && ch.to.trim().length > 0
        );
        
        if (entry.changes.length > 0) {
          this.processedEntries.push(entry);
        }
      }
    }
  }
  
  /**
   * Get sample data as a fallback
   * @returns {Object} Sample data
   */
  getSampleData() {
    return {
      entries: [
        {
          id: "GDG-2018-08-27-001",
          source: "White House Press Release",
          changes: [
            {
              from: "The administration acknowledges serious concerns about climate change impacts.",
              to: "The administration is monitoring environmental conditions."
            }
          ]
        },
        {
          id: "GDG-2018-08-27-002",
          source: "Department of Defense Memo",
          changes: [
            {
              from: "Military operations resulted in 24 civilian casualties in the region.",
              to: "Military operations in the region are under review."
            }
          ]
        }
      ]
    };
  }
}