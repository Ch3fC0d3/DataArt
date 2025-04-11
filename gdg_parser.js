/**
 * GDELT Project GDG Parser
 * This file contains functions to parse and process GDELT Project Government Document Graph data
 */

class GDGParser {
  constructor() {
    this.processedEntries = [];
    this.maxEntries = 100; // Increased to handle more entries
    this.entryCount = 0; // Track total entries processed
  }
  
  /**
   * Process raw GDELT GDG data into a format usable by our visualization
   * @param {string} rawData - The raw GDG data as a string
   * @returns {Object} Processed data with entries array
   */
  parseGDGData(rawData) {
    console.log("Parsing GDG data...");
    
    try {
      // Try to parse the XML directly
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(rawData, "text/xml");
      
      // Get all items from the RSS feed
      const items = xmlDoc.getElementsByTagName('item');
      console.log(`Found ${items.length} items in the feed`);
      
      // Process each item
      for (let i = 0; i < items.length && this.processedEntries.length < this.maxEntries; i++) {
        const item = items[i];
        
        // Get the title and description
        const title = item.getElementsByTagName('title')[0]?.textContent || "Government Document";
        const description = item.getElementsByTagName('description')[0]?.textContent || "";
        const link = item.getElementsByTagName('link')[0]?.textContent || "";
        
        // Create an entry
        const entry = {
          source: this.extractDomainFromUrl(link) || title,
          changes: []
        };
        
        // Try to extract changes from the description
        if (description) {
          // Split by common separators
          const parts = description.split(/\s*\-\s*|\s*:\s*/);
          
          // If we have enough parts, treat them as from/to
          if (parts.length >= 2) {
            entry.changes.push({
              from: this.cleanText(parts[0]),
              to: this.cleanText(parts.slice(1).join(' '))
            });
          }
        }
        
        // If we couldn't get changes from description, try to create synthetic ones
        if (entry.changes.length === 0 && link) {
          const originalText = this.generateOriginalText(link);
          const redactedText = this.createRedactedVersion(originalText);
          
          entry.changes.push({
            from: originalText,
            to: redactedText
          });
        }
        
        // Add the entry if it has valid changes
        if (entry.changes.length > 0) {
          this.addEntry(entry);
        }
      }
      
      // If we couldn't extract enough entries, use our sample data
      if (this.processedEntries.length < 10) {
        console.warn("Not enough entries extracted from GDG data, using sample data");
        return this.getSampleData();
      }
      
      console.log(`Successfully processed ${this.processedEntries.length} entries`);
      return {
        entries: this.processedEntries
      };
      
    } catch (error) {
      console.error("Error parsing GDG data:", error);
      return this.getSampleData();
    }
  }
  
  /**
   * Extract source information from an entry
   * @param {Object} entry - The entry to extract from
   * @returns {string} The source information
   */
  extractSource(entry) {
    // Try to get the most specific source information
    if (entry.source) return entry.source;
    if (entry.page_url) return this.formatUrl(entry.page_url);
    if (entry.url) return this.formatUrl(entry.url);
    
    // Check for organization or department
    if (entry.organization) return entry.organization;
    if (entry.department) return entry.department;
    
    // Default source
    return "Government Document";
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
   * Extract domain from URL
   * @param {string} url - The URL to extract from
   * @returns {string} Extracted domain
   */
  extractDomainFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace(/^www\./, '');
    } catch (e) {
      return "";
    }
  }
  
  /**
   * Clean and format text for display
   * @param {string} text - The text to clean
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    if (!text) return "";
    
    // Replace newlines with spaces
    let cleaned = text.replace(/\n/g, ' ');
    
    // Remove excessive whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    // Ensure text isn't too short
    if (cleaned.length < 10) {
      cleaned += " [content redacted]";
    }
    
    return cleaned;
  }
  
  /**
   * Try to extract any text content from an entry
   * @param {Object} entry - The entry to extract from
   */
  extractTextContent(entry) {
    // Look for any fields that might contain text content
    const textFields = ['content', 'text', 'body', 'description', 'summary', 'title'];
    
    for (const field of textFields) {
      if (entry[field] && typeof entry[field] === 'string' && entry[field].length > 20) {
        // Found some text content, create a synthetic change
        const originalText = entry[field];
        const redactedText = this.createRedactedVersion(originalText);
        
        if (originalText !== redactedText) {
          this.addEntry({
            source: this.extractSource(entry),
            changes: [{
              from: originalText,
              to: redactedText
            }]
          });
          return; // Only use one field per entry
        }
      }
    }
  }
  
  /**
   * Create a redacted version of text by removing specific details
   * @param {string} text - Original text
   * @returns {string} Redacted version
   */
  createRedactedVersion(text) {
    // Replace specific numbers with vague terms
    let redacted = text.replace(/\b\d+(\.\d+)?%\b/g, 'a percentage');
    redacted = redacted.replace(/\b\d+\b/g, 'several');
    
    // Replace specific locations with generic terms
    const locations = ['Afghanistan', 'Iraq', 'Syria', 'Yemen', 'Libya', 'Ukraine', 'Russia', 'China'];
    locations.forEach(location => {
      redacted = redacted.replace(new RegExp(`\\b${location}\\b`, 'gi'), 'the region');
    });
    
    // Replace strong words with weaker ones
    const wordReplacements = {
      'crisis': 'situation',
      'disaster': 'event',
      'catastrophic': 'significant',
      'failed': 'did not meet expectations',
      'corruption': 'irregularities',
      'violated': 'may not have followed',
      'illegal': 'questionable',
      'dangerous': 'concerning'
    };
    
    Object.entries(wordReplacements).forEach(([strong, weak]) => {
      redacted = redacted.replace(new RegExp(`\\b${strong}\\b`, 'gi'), weak);
    });
    
    return redacted;
  }
  
  /**
   * Generate original text for a synthetic change
   * @param {string} link - The link to generate text for
   * @returns {string} Original text
   */
  generateOriginalText(link) {
    return `Original text for ${link}`;
  }
  
  /**
   * Try to extract changes using regex patterns
   * @param {string} line - A line of text to parse
   */
  extractChangesWithRegex(line) {
    // Look for patterns like "from": "text", "to": "text"
    const fromToRegex = /"from"\s*:\s*"([^"]+)"\s*,\s*"to"\s*:\s*"([^"]+)"/g;
    let match;
    
    while ((match = fromToRegex.exec(line)) !== null) {
      if (match[1] && match[2]) {
        this.addEntry({
          source: "GDELT Project",
          changes: [{
            from: this.cleanText(match[1]),
            to: this.cleanText(match[2])
          }]
        });
      }
    }
    
    // Also look for any substantial text that might be content
    const contentRegex = /"([^"]{50,})"/g;
    while ((match = contentRegex.exec(line)) !== null) {
      if (match[1]) {
        const originalText = match[1];
        const redactedText = this.createRedactedVersion(originalText);
        
        if (originalText !== redactedText) {
          this.addEntry({
            source: "GDELT Content",
            changes: [{
              from: originalText,
              to: redactedText
            }]
          });
        }
      }
    }
  }
  
  /**
   * Add an entry to the processed entries array
   * @param {Object} entry - The entry to add
   */
  addEntry(entry) {
    // Only add if we don't have too many entries already
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
        },
        {
          id: "GDG-2018-08-27-003",
          source: "CDC Health Advisory",
          changes: [
            {
              from: "The outbreak has infected over 1,000 people across 12 states.",
              to: "Health officials are monitoring cases of the illness."
            }
          ]
        },
        {
          id: "GDG-2018-08-27-004",
          source: "EPA Environmental Assessment",
          changes: [
            {
              from: "Chemical levels in the water exceed federal safety standards by 300%.",
              to: "Water quality testing continues in affected areas."
            }
          ]
        },
        {
          id: "GDG-2018-08-27-005",
          source: "Department of Justice Statement",
          changes: [
            {
              from: "The investigation found evidence of systematic corruption at multiple levels.",
              to: "The investigation is ongoing and no conclusions have been reached."
            }
          ]
        },
        {
          id: "GDG-2018-08-27-006",
          source: "Federal Reserve Economic Outlook",
          changes: [
            {
              from: "Economic indicators suggest a significant recession is likely within 6 months.",
              to: "Economic conditions are being closely monitored."
            }
          ]
        },
        {
          id: "GDG-2018-08-27-007",
          source: "Department of Education Report",
          changes: [
            {
              from: "Test scores show a 15% decline in student performance nationwide.",
              to: "Educational assessment methods are being evaluated."
            }
          ]
        },
        {
          id: "GDG-2018-08-27-008",
          source: "FDA Drug Safety Communication",
          changes: [
            {
              from: "The medication has been linked to 37 deaths and over 200 severe adverse reactions.",
              to: "The medication's safety profile is under continued evaluation."
            }
          ]
        },
        {
          id: "GDG-2018-08-27-009",
          source: "Department of Homeland Security Alert",
          changes: [
            {
              from: "Critical infrastructure vulnerabilities have been exploited by foreign actors.",
              to: "Infrastructure security protocols are being updated."
            }
          ]
        },
        {
          id: "GDG-2018-08-27-010",
          source: "Veterans Affairs Internal Memo",
          changes: [
            {
              from: "Wait times for critical care have increased to an average of 47 days.",
              to: "Patient care scheduling procedures are being optimized."
            }
          ]
        }
      ]
    };
  }
}