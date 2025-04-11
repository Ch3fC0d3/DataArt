// Global variables
let textBlocks = [];
let gdgData;
let dataLoaded = false;
let loadingStatus = "Loading data...";
let gdgParser; // Instance of our GDG parser
let soundEffects; // Sound effects manager

// Global settings
let settings = {
  paused: false,
  textSize: 20,
  fadeSpeed: 0.5,
  effectIntensity: 50,
  theme: 'cyber', // 'cyber', 'matrix', 'retro'
  maxBlocks: 20,
  addBlockInterval: 5000, // ms
  stats: {
    documentsProcessed: 0, 
    changesDetected: 0,
    wordsRedacted: 0
  }
};

// Particle system for visual effects
let particles = [];
let MAX_PARTICLES = 100;

// For glitch effect
let glitchFrames = 0;
let glitchProbability = 0.01;
let glitching = false;

// For highlighted words
let highlightedWords = [
  "classified", "confidential", "secret", "redacted", "transparency",
  "corruption", "casualties", "failure", "crisis", "violation",
  "unauthorized", "error", "mistake", "disaster", "evidence"
];

function preload() {
  // Initialize the GDG parser
  gdgParser = new GDGParser();
  
  // Initialize sound effects
  soundEffects = new SoundEffects();
  
  // Load the RSS feed from GDELT
  console.log("Loading GDELT RSS feed...");
  updateLoadingStatus("Connecting to GDELT RSS feed...");
  
  // Try to load the real GDELT feed using fetch API instead of p5.loadXML
  // This gives us more control over the request
  console.log("Attempting to load GDELT RSS feed...");
  updateLoadingStatus("Connecting to GDELT RSS feed...");
  
  // Use a CORS proxy to avoid certificate issues
  const corsProxyUrl = 'https://corsproxy.io/?';
  const gdeltUrl = 'http://data.gdeltproject.org/gdeltv3/gdg/RSS-GDG-15MINROLLUP.rss';
  const proxyUrl = corsProxyUrl + encodeURIComponent(gdeltUrl);
  
  // Use fetch with the proxy URL
  fetch(proxyUrl)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.text();
    })
    .then(xmlText => {
      console.log("Successfully loaded GDELT RSS feed");
      updateLoadingStatus("Processing RSS feed data...");
      
      // Parse the XML text to a DOM object
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      
      try {
        // Process the RSS feed data
        processRSSFeed(xmlDoc);
        
        // Update the status message
        const loadingStatus = document.getElementById('loading-status');
        if (loadingStatus) {
          loadingStatus.textContent = "Live data loaded successfully!";
          loadingStatus.style.color = "#00ffff";
        }
        
        // Start adding text blocks after a short delay
        setTimeout(() => {
          settings.blockIntervalId = setInterval(addNewTextBlock, settings.addBlockInterval);
        }, 1000);
      } catch (processError) {
        console.error("Error processing RSS feed:", processError);
        fallbackToSampleData();
      }
    })
    .catch(error => {
      console.error("Could not load GDELT RSS feed:", error);
      fallbackToSampleData();
    });
}

/**
 * Fall back to sample data when RSS feed cannot be loaded or processed
 */
function fallbackToSampleData() {
  updateLoadingStatus("Using sample data...");
  
  // Fall back to our sample data
  gdgData = gdgParser.getSampleData();
  dataLoaded = true;
  settings.stats.documentsProcessed = gdgData.entries.length;
  settings.stats.changesDetected = gdgData.entries.reduce((acc, entry) => acc + entry.changes.length, 0);
  settings.stats.wordsRedacted = gdgData.entries.reduce((acc, entry) => {
    return acc + entry.changes.reduce((acc2, change) => acc2 + change.from.split(' ').length, 0);
  }, 0);
  updateStats();
  
  // Start adding text blocks with sample data
  if (!settings.blockIntervalId) {
    settings.blockIntervalId = setInterval(addNewTextBlock, settings.addBlockInterval);
  }
  
  // Add multiple initial text blocks immediately to populate the screen
  console.log("Adding initial text blocks...");
  setTimeout(() => {
    // Add several blocks with different positions to create an interesting layout
    for (let i = 0; i < 5; i++) {
      addNewTextBlock();
    }
  }, 500);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Courier New');
  textSize(settings.textSize);
  frameRate(60);

  // Set up controls
  setupControlListeners();
  
  // Set up a timer to add new text blocks periodically
  // This will start after the first user interaction
}

function setupControlListeners() {
  // Toggle UI visibility button
  const toggleUIBtn = document.getElementById('btn-toggle-ui');
  if (toggleUIBtn) {
    toggleUIBtn.addEventListener('click', () => {
      // Toggle visibility of controls and legend
      const controls = document.querySelector('.controls');
      const legend = document.querySelector('.legend');
      const uiVisible = controls.style.display !== 'none';
      
      if (uiVisible) {
        // Hide UI elements
        controls.style.display = 'none';
        legend.style.display = 'none';
        toggleUIBtn.textContent = 'Show Controls';
      } else {
        // Show UI elements
        controls.style.display = 'block';
        legend.style.display = 'block';
        toggleUIBtn.textContent = 'Hide Controls';
      }
      
      // Play UI click sound
      soundEffects.playUIClick();
    });
  }
  
  // Toggle flow button
  const toggleFlowBtn = document.getElementById('btn-toggle-flow');
  if (toggleFlowBtn) {
    toggleFlowBtn.addEventListener('click', () => {
      settings.paused = !settings.paused;
      toggleFlowBtn.textContent = settings.paused ? 'Resume Flow' : 'Pause Flow';
      
      // Play UI click sound
      soundEffects.playUIClick();
    });
  }
  
  // Add block button
  const addBlockBtn = document.getElementById('btn-add-block');
  if (addBlockBtn) {
    addBlockBtn.addEventListener('click', () => {
      addNewTextBlock();
      
      // Play UI click sound
      soundEffects.playUIClick();
    });
  }
  
  // Toggle sound button
  const toggleSoundBtn = document.getElementById('btn-toggle-sound');
  if (toggleSoundBtn) {
    toggleSoundBtn.addEventListener('click', async () => {
      const soundEnabled = await soundEffects.toggleSounds();
      toggleSoundBtn.textContent = soundEnabled ? 'Sound: ON' : 'Sound: OFF';
      
      if (soundEnabled) {
        soundEffects.setVolume(settings.effectIntensity);
        soundEffects.playUIClick();
      }
    });
  }
  
  // Theme toggle button
  const themeBtn = document.getElementById('btn-theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const themes = ['cyber', 'matrix', 'retro'];
      const currentIndex = themes.indexOf(settings.theme);
      settings.theme = themes[(currentIndex + 1) % themes.length];
      themeBtn.textContent = `Theme: ${settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1)}`;
      
      soundEffects.playUIClick();
    });
  }
  
  // Volume control
  const volumeSlider = document.getElementById('volumeSlider');
  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const volume = parseInt(e.target.value);
      settings.volume = volume;
      soundEffects.setVolume(volume);
    });
  }
  
  // Effect intensity control
  const effectSlider = document.getElementById('effectSlider');
  if (effectSlider) {
    effectSlider.addEventListener('input', (e) => {
      settings.effectIntensity = parseInt(e.target.value);
      
      MAX_PARTICLES = Math.floor(settings.effectIntensity * 2);
      glitchProbability = settings.effectIntensity / 5000;
      
      if (soundEffects.enabled) {
        soundEffects.setVolume(settings.effectIntensity);
      }
    });
  }
  
  // Text size control
  const textSizeSlider = document.getElementById('textSizeSlider');
  if (textSizeSlider) {
    textSizeSlider.addEventListener('input', (e) => {
      settings.textSize = parseInt(e.target.value);
    });
  }
  
  // Fade speed control
  const fadeSpeedSlider = document.getElementById('fadeSpeedSlider');
  if (fadeSpeedSlider) {
    fadeSpeedSlider.addEventListener('input', (e) => {
      settings.fadeSpeed = parseFloat(e.target.value);
    });
  }
  
  // Block interval control
  const blockIntervalSlider = document.getElementById('blockIntervalSlider');
  if (blockIntervalSlider) {
    blockIntervalSlider.addEventListener('input', (e) => {
      settings.addBlockInterval = parseInt(e.target.value);
    });
  }
}

/**
 * Update the loading status text
 * @param {string} message - Status message to display
 */
function updateLoadingStatus(message) {
  loadingStatus = message;
  const statusElement = document.getElementById('loading-status');
  if (statusElement) {
    statusElement.textContent = message;
  }
}

/**
 * Update the statistics panel
 */
function updateStats() {
  const statsPanel = document.getElementById('stats-panel');
  if (statsPanel) {
    statsPanel.innerHTML = `Documents: ${settings.stats.documentsProcessed} | Changes: ${settings.stats.changesDetected} | Words Redacted: ${settings.stats.wordsRedacted}`;
  }
}

/**
 * Process the RSS feed data from GDELT
 * @param {Object} rssData - The XML data from the RSS feed
 */
function processRSSFeed(rssData) {
  try {
    // Extract items from the RSS feed
    const items = rssData.getElementsByTagName('item');
    console.log(`Found ${items.length} items in the RSS feed`);
    
    if (items.length === 0) {
      console.warn('No items found in the RSS feed');
      throw new Error('No items found in the RSS feed');
    }
    
    // Create an array to store the processed entries
    const entries = [];
    
    // Process each item in the RSS feed
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      try {
        // Get data from the item
        const link = item.getElementsByTagName('link')[0]?.textContent || '';
        const title = item.getElementsByTagName('title')[0]?.textContent || '';
        const description = item.getElementsByTagName('description')[0]?.textContent || '';
        
        // Create an entry with the link as the source
        const entry = {
          source: extractDomainFromUrl(link) || 'GDELT Project',
          changes: []
        };
        
        // Try to use real content from the feed first
        let originalText = '';
        if (description && description.length > 20) {
          originalText = description;
        } else if (title && title.length > 10) {
          originalText = title;
        } else {
          // Fall back to synthetic text if needed
          originalText = generateOriginalText(link);
        }
        
        // Create the redacted version
        const redactedText = gdgParser.createRedactedVersion(originalText);
        
        entry.changes.push({
          from: originalText,
          to: redactedText
        });
        
        // Track stats
        const wordCount = originalText.split(' ').length;
        settings.stats.wordsRedacted += wordCount;
        settings.stats.changesDetected++;
        
        // Add the entry to our list
        entries.push(entry);
      } catch (itemError) {
        console.warn(`Error processing item ${i}:`, itemError);
        // Continue with next item
        continue;
      }
    }
    
    if (entries.length === 0) {
      throw new Error('No valid entries could be extracted');
    }
    
    // Set the gdgData object with the processed entries
    gdgData = { entries: entries };
    dataLoaded = true;
    updateLoadingStatus("Live data loaded successfully!");
    
    // Update stats
    settings.stats.documentsProcessed = entries.length;
    updateStats();
    
    console.log(`Successfully processed ${entries.length} entries from the RSS feed`);
    
    // Add initial blocks immediately
    setTimeout(() => {
      for (let i = 0; i < 3; i++) {
        addNewTextBlock();
      }
    }, 500);
  } catch (error) {
    console.error("Error processing RSS feed:", error);
    
    // Fall back to sample data if there's an error
    gdgData = gdgParser.getSampleData();
    dataLoaded = true;
    updateLoadingStatus("Using sample data due to processing error");
    
    // Update stats with sample data
    settings.stats.documentsProcessed = gdgData.entries.length;
    settings.stats.changesDetected = gdgData.entries.reduce((acc, entry) => acc + entry.changes.length, 0);
    settings.stats.wordsRedacted = gdgData.entries.reduce((acc, entry) => {
      return acc + entry.changes.reduce((acc2, change) => acc2 + change.from.split(' ').length, 0);
    }, 0);
    updateStats();
    
    // Add initial blocks with sample data
    setTimeout(() => {
      for (let i = 0; i < 5; i++) {
        addNewTextBlock();
      }
    }, 500);
  }
}

/**
 * Extract the domain from a URL
 * @param {string} url - The URL to extract from
 * @returns {string} The domain name
 */
function extractDomainFromUrl(url) {
  try {
    // Try to parse the URL and extract the hostname
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch (e) {
    // Return the URL as is if it can't be parsed
    return url;
  }
}

/**
 * Generate original text based on a URL
 * @param {string} url - The URL to generate text from
 * @returns {string} Generated original text
 */
function generateOriginalText(url) {
  // Extract domain and path components to create realistic text
  let domain = extractDomainFromUrl(url);
  
  // Create a pool of realistic text fragments based on the domain
  const textFragments = [
    `Reports from ${domain} indicate significant concerns about government transparency.`,
    `${domain} published documents revealing detailed statistics on civilian casualties.`,
    `Internal memo obtained by ${domain} shows critical failures in the oversight process.`,
    `Classified information released by ${domain} exposes specific details about military operations.`,
    `${domain} investigation uncovered evidence of systematic violations in multiple departments.`,
    `Leaked documents on ${domain} reveal exact figures related to the environmental impact.`,
    `${domain} reports that officials acknowledged serious mistakes in handling the crisis.`,
    `Whistleblower testimony published on ${domain} details explicit timeline of events.`,
    `${domain} obtained documents showing precise numbers of affected individuals.`,
    `Investigation by ${domain} reveals concrete evidence of policy failures.`
  ];
  
  // Select a random text fragment
  return textFragments[Math.floor(Math.random() * textFragments.length)];
}

/**
 * Generate redacted text based on original text
 * @param {string} url - The URL used to generate the original text
 * @returns {string} Generated redacted text
 */
function generateRedactedText(url) {
  // Extract domain for consistent text generation
  let domain = extractDomainFromUrl(url);
  
  // Create a pool of redacted text fragments based on the domain
  const redactedFragments = [
    `${domain} discusses ongoing government communication efforts.`,
    `Information published on ${domain} mentions administrative procedures being followed.`,
    `${domain} reports that the situation is being monitored by appropriate authorities.`,
    `Statement released through ${domain} indicates that operations are proceeding as authorized.`,
    `${domain} indicates that standard protocols are being implemented.`,
    `${domain} reports that environmental conditions are being assessed.`,
    `Officials quoted by ${domain} state that the matter is under review.`,
    `${domain} reports that the timeline of events is being evaluated.`,
    `${domain} mentions that the number of cases is being tracked.`,
    `${domain} indicates that policies are being examined for potential improvements.`
  ];
  
  // Select a random redacted fragment
  return redactedFragments[Math.floor(Math.random() * redactedFragments.length)];
}

function processData() {
  // Check if data is available
  if (!gdgData || !gdgData.entries) {
    console.warn("Data not yet available");
    return false;
  }
  
  // Only process once
  if (textBlocks.length > 0) {
    return true;
  }
  
  console.log("Processing data:", gdgData);
  
  // Extract entries and render them
  let changes = gdgData.entries;
  
  for (let i = 0; i < min(5, changes.length); i++) {
    let entry = changes[i];
    let diff = [];
    
    // Add source information
    diff.push({ word: "Source: " + entry.source, type: "info" });
    
    for (let ch of entry.changes) {
      diff.push({ word: ch.from.replace(/\n/g, ' '), type: "deleted" });
      diff.push({ word: ch.to.replace(/\n/g, ' '), type: "inserted" });
    }
    
    textBlocks.push(new DiffBlock(diff, 50, 150 + i * 80));
  }
  
  return true;
}

function draw() {
  // Apply theme-based background
  applyThemeBackground();
  
  // Occasionally apply glitch effect
  if (random() < glitchProbability && settings.effectIntensity > 20) {
    glitching = true;
    glitchFrames = floor(random(3, 8));
    
    // Play glitch sound
    soundEffects.playGlitch();
  }
  
  // Apply glitch effect if active
  if (glitching) {
    applyGlitchEffect();
    glitchFrames--;
    if (glitchFrames <= 0) {
      glitching = false;
    }
  }
  
  // Draw title directly on canvas
  drawTitle();
  
  // Reset text size for content
  textSize(settings.textSize);
  
  // Check if data is loaded
  if (!dataLoaded) {
    // Display loading message
    fill(100);
    text(loadingStatus, 50, 150);
    text("Please wait...", 50, 170);
    return;
  }
  
  // Process data if we haven't already
  if (textBlocks.length === 0) {
    processData();
  }
  
  // Update and display particles
  updateAndDisplayParticles();
  
  // Update and display all text blocks
  if (!settings.paused) {
    for (let block of textBlocks) {
      block.update();
      block.display();
    }
  } else {
    // If paused, just display without updating
    for (let block of textBlocks) {
      block.display();
    }
  }
}

/**
 * Apply the current theme's background
 */
function applyThemeBackground() {
  switch (settings.theme) {
    case 'cyber':
      // Dark blue background with grid effect
      background(0, 5, 20, 20); // Dark blue with alpha for trail effect
      
      // Draw subtle grid lines
      stroke(0, 50, 100, 10);
      strokeWeight(1);
      for (let i = 0; i < width; i += 50) {
        line(i, 0, i, height);
      }
      for (let i = 0; i < height; i += 50) {
        line(0, i, width, i);
      }
      break;
      
    case 'matrix':
      // Black with green matrix rain effect
      background(0, 0, 0, 20);
      
      // Add matrix code rain effect occasionally
      if (random() < 0.1 && particles.length < MAX_PARTICLES) {
        let x = random(width);
        particles.push(new Particle(x, 0, 'matrix'));
      }
      break;
      
    case 'retro':
      // Dark amber on black
      background(0, 0, 0, 20);
      
      // Add scan line effect
      stroke(255, 150, 0, 10);
      strokeWeight(1);
      for (let i = 0; i < height; i += 2) {
        line(0, i, width, i);
      }
      break;
      
    default:
      // Default fallback
      background(0, 20);
  }
}

/**
 * Apply a digital glitch effect to the screen
 */
function applyGlitchEffect() {
  // Create random visual artifacts
  for (let i = 0; i < 10; i++) {
    let x = random(width);
    let y = random(height);
    let w = random(20, 100);
    let h = random(5, 15);
    
    // Pick a glitch color based on theme
    let glitchColor;
    switch (settings.theme) {
      case 'cyber':
        glitchColor = color(0, random(100, 255), random(200, 255), random(100, 200));
        break;
      case 'matrix':
        glitchColor = color(0, random(100, 255), 0, random(100, 200));
        break;
      case 'retro':
        glitchColor = color(random(200, 255), random(100, 200), 0, random(100, 200));
        break;
      default:
        glitchColor = color(random(255), random(255), random(255), random(100, 200));
    }
    
    fill(glitchColor);
    noStroke();
    rect(x, y, w, h);
  }
  
  // Add some random lines
  for (let i = 0; i < 5; i++) {
    stroke(255, random(50, 150));
    strokeWeight(random(1, 3));
    line(0, random(height), width, random(height));
  }
}

/**
 * Update and display all particles
 */
function updateAndDisplayParticles() {
  // Update and display particles
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();
    
    // Remove particles that are off-screen
    if (particles[i].isOffScreen()) {
      particles.splice(i, 1);
    }
  }
  
  // Add new particles occasionally based on effect intensity
  if (random() < settings.effectIntensity / 1000 && particles.length < MAX_PARTICLES) {
    let x = random(width);
    let y = random(height);
    particles.push(new Particle(x, y, settings.theme));
  }
}

/**
 * Add a new text block
 */
function addNewTextBlock() {
  // Only add new blocks if data is loaded, not paused, and we have entries
  if (!dataLoaded || settings.paused || !gdgData || !gdgData.entries || gdgData.entries.length === 0) {
    console.warn("Cannot add text block - data not ready");
    return;
  }
  
  // Remove blocks that have completely faded away
  textBlocks = textBlocks.filter(block => block.alpha > 30);
  
  // Don't add too many blocks to avoid performance issues
  if (textBlocks.length >= settings.maxBlocks) {
    // Remove the oldest block
    textBlocks.shift();
  }
  
  // Select a random entry from the data
  const randomIndex = floor(random(gdgData.entries.length));
  const entry = gdgData.entries[randomIndex];
  
  if (!entry || !entry.changes || entry.changes.length === 0) {
    console.warn("Invalid entry or no changes found");
    return;
  }
  
  let diff = [];
  
  // Add source information with proper formatting
  const sourceText = "Source: " + (entry.source || "Government Document");
  diff.push({ word: sourceText, type: "info" });
  
  // Add the changes with proper word splitting for better display
  for (let ch of entry.changes) {
    if (ch.from && ch.to) {
      // Split the text into words for better display
      const fromWords = ch.from.replace(/\n/g, ' ').split(' ');
      const toWords = ch.to.replace(/\n/g, ' ').split(' ');
      
      // Add original text (deleted)
      fromWords.forEach(word => {
        if (word.trim() !== "") {
          diff.push({ word: word, type: "deleted" });
        }
      });
      
      // Add a separator
      diff.push({ word: "→", type: "info" });
      
      // Add redacted text (inserted)
      toWords.forEach(word => {
        if (word.trim() !== "") {
          diff.push({ word: word, type: "inserted" });
        }
      });
    }
  }
  
  // Only add the block if we have content
  if (diff.length <= 1) {
    console.warn("No content to display in text block");
    return;
  }
  
  // Add the new text block at a random position on screen
  const x = random(50, width/2);
  const y = random(120, height - 150);
  
  console.log("Adding new text block with", diff.length, "words");
  textBlocks.push(new DiffBlock(diff, x, y));
  
  // Play sound effect if initialized
  if (soundEffects && soundEffects.initialized) {
    soundEffects.playTextAppear();
  }
}

/**
 * Particle class for visual effects
 */
class Particle {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type || 'default';
    this.alpha = random(150, 255);
    this.size = random(2, 8);
    this.speed = random(1, 3);
    this.gravity = random(0.01, 0.05);
    this.vx = random(-1, 1);
    this.vy = random(-0.5, 0.5);
    
    // For matrix particles
    if (this.type === 'matrix') {
      this.char = String.fromCharCode(random(33, 126));
      this.speed = random(2, 5);
      this.vy = this.speed;
      this.vx = 0;
      this.gravity = 0;
      this.timeToChange = random(10, 20);
    }
  }

  update() {
    // Update position
    this.x += this.vx;
    this.y += this.vy;
    
    // Apply gravity for some particle types
    if (this.type !== 'matrix') {
      this.vy += this.gravity;
    }
    
    // Fade out
    this.alpha -= random(0.5, 1.5);
    
    // Matrix particles should change characters occasionally
    if (this.type === 'matrix') {
      this.timeToChange--;
      if (this.timeToChange <= 0) {
        this.char = String.fromCharCode(random(33, 126));
        this.timeToChange = random(5, 15);
      }
    }
  }

  display() {
    if (this.type === 'matrix') {
      // Display matrix code character
      fill(0, 255, 0, this.alpha);
      textSize(this.size * 2);
      textAlign(CENTER, CENTER);
      text(this.char, this.x, this.y);
    } else if (this.type === 'cyber') {
      // Display cyber particle
      fill(0, random(100, 200), 255, this.alpha);
      noStroke();
      rect(this.x, this.y, this.size, this.size);
    } else if (this.type === 'retro') {
      // Display retro particle
      fill(255, random(100, 200), 0, this.alpha);
      noStroke();
      rect(this.x, this.y, this.size, this.size / 2);
    } else {
      // Default particle
      fill(200, 200, 255, this.alpha);
      noStroke();
      ellipse(this.x, this.y, this.size);
    }
  }

  isOffScreen() {
    return (
      this.x < 0 ||
      this.x > width ||
      this.y > height ||
      this.alpha <= 0
    );
  }
}

class DiffBlock {
  constructor(diffArray, x, y) {
    this.diff = diffArray;
    this.x = x;
    this.y = y;
    this.alpha = 255; // start fully visible
    this.fadeSpeed = random(0.2, 0.6) * settings.fadeSpeed; // adjust by global setting
    this.lifetime = 0; // track how long this block has been displayed
    this.maxWidth = windowWidth - 100; // prevent text from going off-screen
    this.minAlpha = 40; // never fade completely away
    this.highlighted = false; // for highlighting important words
    this.highlightTimer = 0;
    this.glitchTimer = 0;
    
    // Add slight initial movement
    this.vx = random(-0.5, 0.5);
    this.vy = random(-0.5, 0.5);
  }

  update() {
    if (settings.paused) return;
    
    this.lifetime++;
    
    // Start fading after a delay
    if (this.lifetime > 240) { // ~4 seconds at 60fps
      this.alpha -= this.fadeSpeed;
      this.alpha = max(this.alpha, this.minAlpha); // never go below minAlpha
    }
    
    // Apply slight movement
    this.x += this.vx;
    this.y += this.vy;
    
    // Dampen movement over time
    this.vx *= 0.99;
    this.vy *= 0.99;
    
    // Add slight random movement occasionally
    if (this.lifetime % 60 === 0) { // Every second
      this.vx += random(-0.2, 0.2);
      this.vy += random(-0.2, 0.2);
    }
    
    // Occasionally highlight deleted text
    if (random() < 0.001 * settings.effectIntensity) {
      this.highlighted = true;
      this.highlightTimer = 20;
      
      // Play redaction sound
      soundEffects.playRedaction();
    }
    
    // Countdown highlight timer
    if (this.highlighted) {
      this.highlightTimer--;
      if (this.highlightTimer <= 0) {
        this.highlighted = false;
      }
    }
    
    // Apply occasional text glitch
    if (random() < 0.0005 * settings.effectIntensity) {
      this.glitchTimer = floor(random(5, 15));
    }
    
    if (this.glitchTimer > 0) {
      this.glitchTimer--;
    }
  }

  display() {
    push();
    translate(this.x, this.y);
    let xOffset = 0;
    let yOffset = 0;
    let lineHeight = 30; // increased space between lines
    textSize(settings.textSize);
    
    // Debug info
    if (this.diff.length === 0) {
      fill(255, 0, 0, this.alpha);
      text("[Empty diff block]", 0, 0);
      pop();
      return;
    }

    for (let d of this.diff) {
      if (!d.word || d.word.trim() === "") continue;

      let wordWidth = textWidth(d.word + " ");
      
      // Check if we need to wrap to next line
      if (xOffset + wordWidth > this.maxWidth) {
        xOffset = 0;
        yOffset += lineHeight;
      }
      
      // Handle different types of text
      if (d.type === "info") {
        // Information text (like source) - color based on theme
        switch (settings.theme) {
          case 'cyber':
            fill(0, 150, 255, this.alpha);
            break;
          case 'matrix':
            fill(0, 255, 0, this.alpha);
            break;
          case 'retro':
            fill(255, 150, 0, this.alpha);
            break;
          default:
            fill(0, 102, 153, this.alpha);
        }
        
        textStyle(BOLD);
        text(d.word, xOffset, yOffset);
        textStyle(NORMAL);
    } else if (d.type === "deleted") {
        // Deleted text (original version)
        if (this.highlighted) {
          // Highlighted state (when showing redacted content)
          fill(255, 50, 50, this.alpha);
          stroke(255, 100, 100, this.alpha / 2);
          strokeWeight(2);
        } else {
          // Normal state
          switch (settings.theme) {
            case 'cyber':
              fill(200, 50, 50, this.alpha);
              break;
            case 'matrix':
              fill(200, 255, 200, this.alpha);
              break;
            case 'retro':
              fill(255, 200, 100, this.alpha);
              break;
            default:
              fill(180, 80, 80, this.alpha);
          }
          noStroke();
        }
        
        // Apply glitch effect to text if timer is active
        if (this.glitchTimer > 0 && random() < 0.3) {
          // Randomize some characters for glitch effect
          let glitchText = "";
          for (let i = 0; i < d.word.length; i++) {
            if (random() < 0.2) {
              glitchText += String.fromCharCode(random(33, 126));
            } else {
              glitchText += d.word.charAt(i);
            }
          }
          text(glitchText, xOffset, yOffset);
        } else {
          // Check if word should be emphasized (if it's in our highlightedWords list)
          let wordLower = d.word.toLowerCase();
          let emphasized = false;
          
          for (let hw of highlightedWords) {
            if (wordLower.includes(hw)) {
              emphasized = true;
              textStyle(BOLD);
              break;
            }
          }
          
          text(d.word, xOffset, yOffset);
          
          if (emphasized) {
            textStyle(NORMAL);
          }
        }
      } else if (d.type === "inserted") {
        // Inserted text (redacted version)
        switch (settings.theme) {
          case 'cyber':
            fill(100, 150, 200, this.alpha);
            break;
          case 'matrix':
            fill(100, 200, 100, this.alpha);
            break;
          case 'retro':
            fill(200, 150, 100, this.alpha);
            break;
          default:
            fill(100, 120, 140, this.alpha);
        }
        
        // Check if word should be emphasized (if it's in our highlightedWords list)
        let wordLower = d.word.toLowerCase();
        let emphasized = false;
        
        for (let hw of highlightedWords) {
          if (wordLower.includes(hw)) {
            emphasized = true;
            textStyle(BOLD);
            break;
          }
        }
        
        text(d.word, xOffset, yOffset);
        
        if (emphasized) {
          textStyle(NORMAL);
        }
      } else {
        // Default text style
        fill(200, 200, 200, this.alpha);
        text(d.word, xOffset, yOffset);
      }
      
      // Move to the position for the next word
      xOffset += textWidth(d.word + " ");
      text(" ", xOffset - textWidth(" "), yOffset); // Add space between words
    }
    
    pop();
  }
}

// Variables for ripple effect
let rippleTime = 0;
let rippleSpeed = 0.05;
let rippleAmplitude = 3;

/**
 * Draw the title directly on the canvas
 */
function drawTitle() {
  push();
  // Set text properties for first line
  textAlign(LEFT);
  textFont('Courier New');
  fill(255);
  stroke(0);
  strokeWeight(2);
  
  // Draw first line
  textSize(32);
  text('> OUR HISTORY IS CHANGING', 20, 40);
  
  // Draw second line with ripple effect
  textSize(28);
  drawRippleText('RIGHT BEFORE YOUR LIES', 50, 75);
  
  // Draw subtitle
  textSize(20);
  fill(0, 255, 255, 180);
  text('THE TRUTH, REDACTED', 20, 110);
  pop();
  
  // Update ripple time
  rippleTime += rippleSpeed;
}

/**
 * Draw text with a ripple effect
 * @param {string} txt - The text to draw
 * @param {number} x - X position
 * @param {number} y - Y position
 */
function drawRippleText(txt, x, y) {
  push();
  // No stroke for individual characters to look better
  noStroke();
  
  // Draw each character with offset based on sine wave
  for (let i = 0; i < txt.length; i++) {
    const char = txt.charAt(i);
    const offset = sin(rippleTime + i * 0.3) * rippleAmplitude;
    
    // Add a subtle color variation based on the ripple
    const colorShift = map(sin(rippleTime + i * 0.3), -1, 1, 0, 50);
    fill(255, 255 - colorShift, 255 - colorShift);
    
    // Draw the character with vertical offset
    text(char, x + i * textWidth('A'), y + offset);
  }
  pop();
}

/**
 * Handle window resizing
 */
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
