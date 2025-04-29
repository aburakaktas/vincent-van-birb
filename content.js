console.log('Content script: Initializing...');

// Create or get style element
let styleElement = document.getElementById('color-variable-editor-style');
if (!styleElement) {
  console.log('Content script: Creating new style element');
  styleElement = document.createElement('style');
  styleElement.id = 'color-variable-editor-style';
  // Insert at the very beginning of the head to ensure it's applied first
  document.head.insertBefore(styleElement, document.head.firstChild);
} else {
  console.log('Content script: Found existing style element');
}

// Initialize with empty rules
styleElement.textContent = ':root {}';

// Function to get current color values from the website
function getCurrentColors(variables) {
  console.log('Content script: Getting current colors for variables:', variables);
  const colors = {};
  variables.forEach(variable => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    if (value) {
      colors[variable] = value;
    }
  });
  console.log('Content script: Retrieved colors:', colors);
  return colors;
}

// Function to update a single color
function updateColor(variable, value) {
  console.log('Content script: Updating color:', variable, value);
  
  // Get current CSS rules
  const currentRules = styleElement.textContent;
  console.log('Content script: Current rules:', currentRules);
  
  // Check if the variable already exists in the rules
  const variableRegex = new RegExp(`${variable}:\\s*[^;]+;`);
  
  let newRules;
  if (variableRegex.test(currentRules)) {
    // Replace existing variable
    newRules = currentRules.replace(
      variableRegex,
      `${variable}: ${value};`
    );
    console.log('Content script: Replacing existing variable');
  } else {
    // Add new variable
    newRules = currentRules.replace(
      ':root {',
      `:root {\n  ${variable}: ${value};`
    );
    console.log('Content script: Adding new variable');
  }
  
  // Update the style element
  styleElement.textContent = newRules;
  console.log('Content script: Updated CSS rules:', newRules);

  // Also update the CSS variable directly on the root element
  document.documentElement.style.setProperty(variable, value);
  console.log('Content script: Updated root element style property');
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Content script: Received message:', request);
  
  if (request.action === 'updateColor') {
    updateColor(request.variable, request.value);
    // Send response back to popup
    sendResponse({ success: true });
  } else if (request.action === 'getCurrentColors') {
    const colors = getCurrentColors(request.variables);
    sendResponse({ colors: colors });
  }
});

// Function to apply all saved colors
function applySavedColors() {
  console.log('Content script: Applying saved colors');
  chrome.storage.sync.get([
    '--color-primary',
    '--color-primary-dark',
    '--color-cta',
    '--color-cta-active',
    '--color-cta-hover',
    '--color-cta-text',
    '--color-error',
    '--color-confirmation-green',
    '--color-confirmation-green-light'
  ], function(result) {
    console.log('Content script: Retrieved saved colors:', result);
    Object.entries(result).forEach(([variable, value]) => {
      if (value) {
        updateColor(variable, value);
      }
    });
  });
}

// Function to ensure colors are applied
function ensureColorsApplied() {
  console.log('Content script: Ensuring colors are applied');
  applySavedColors();
}

// Function to apply colors with delay
function applyColorsWithDelay() {
  console.log('Content script: Scheduling delayed color application');
  setTimeout(function() {
    console.log('Content script: Applying colors after delay');
    ensureColorsApplied();
  }, 1000); // 1 second delay
}

// Apply colors immediately
console.log('Content script: Initial color application');
applyColorsWithDelay();

// Also apply colors when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Content script: DOM loaded, applying colors');
  applyColorsWithDelay();
});

// Apply colors when the page is fully loaded
window.addEventListener('load', function() {
  console.log('Content script: Page fully loaded, applying colors');
  applyColorsWithDelay();
});

// Apply colors when the page is about to be unloaded (for navigation)
window.addEventListener('beforeunload', function() {
  console.log('Content script: Page unloading, saving current colors');
  const variables = [
    '--color-primary',
    '--color-primary-dark',
    '--color-cta',
    '--color-cta-active',
    '--color-cta-hover',
    '--color-cta-text',
    '--color-error',
    '--color-confirmation-green',
    '--color-confirmation-green-light'
  ];
  const colors = getCurrentColors(variables);
  chrome.storage.sync.set(colors);
});

// Apply colors when the URL changes (for single-page applications)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    console.log('Content script: URL changed, applying colors');
    applyColorsWithDelay();
  }
}).observe(document, { subtree: true, childList: true });

// Apply colors when the page is ready
if (document.readyState === 'loading') {
  document.addEventListener('readystatechange', function() {
    if (document.readyState === 'interactive') {
      console.log('Content script: Document interactive, applying colors');
      applyColorsWithDelay();
    }
  });
} else {
  console.log('Content script: Document already interactive, applying colors');
  applyColorsWithDelay();
} 