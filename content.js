// Create or get style element
let styleElement = document.getElementById('color-variable-editor-style');
if (!styleElement) {
  styleElement = document.createElement('style');
  styleElement.id = 'color-variable-editor-style';
  document.head.insertBefore(styleElement, document.head.firstChild);
}

// Initialize with empty rules if not already initialized
if (!styleElement.textContent.trim()) {
  styleElement.textContent = ':root {}';
}

// Cache for current colors
let colorCache = {};

// Original colors from server - this should never be modified after initial capture
let originalColors = {};

// Function to save colors to cookie
function saveColorsToCookie(colors, isOriginal = false) {
  const cookieName = isOriginal ? 'birb_gogh_original_colors' : 'birb_gogh_colors';
  document.cookie = `${cookieName}=${JSON.stringify(colors)}; path=/; max-age=31536000; SameSite=Lax`;
}

// Function to get colors from cookie
function getColorsFromCookie(isOriginal = false) {
  const cookieName = isOriginal ? 'birb_gogh_original_colors' : 'birb_gogh_colors';
  const cookie = document.cookie.split('; ').find(row => row.startsWith(cookieName + '='));
  if (cookie) {
    try {
      return JSON.parse(decodeURIComponent(cookie.split('=')[1]));
    } catch (e) {
      return null;
    }
  }
  return null;
}

// Function to capture original colors from server
function captureOriginalColors() {
  // First try to get original colors from cookie
  const cookieColors = getColorsFromCookie(true);
  if (cookieColors && Object.keys(cookieColors).length > 0) {
    originalColors = cookieColors;
    return originalColors;
  }
  
  // If no cookie, capture from page
  const allStyles = getComputedStyle(document.documentElement);
  const cssVariables = {};
  for (let i = 0; i < allStyles.length; i++) {
    const prop = allStyles[i];
    if (prop.startsWith('--')) {
      cssVariables[prop] = allStyles.getPropertyValue(prop).trim();
    }
  }

  const variables = [
    '--color-primary',
    '--color-primary-dark',
    '--color-cta',
    '--color-cta-active',
    '--color-cta-text',
    '--color-error',
    '--color-confirmation-green',
    '--color-confirmation-green-light',
    // Add ferienwohnungen.de specific variables
    '--fw-primary',
    '--fw-primary-dark',
    '--fw-cta',
    '--fw-cta-active',
    '--fw-cta-text',
    '--fw-error',
    '--fw-success',
    '--fw-success-light'
  ];
  
  // Only capture original colors if we haven't already
  if (Object.keys(originalColors).length === 0) {
    variables.forEach(variable => {
      const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
      if (value) {
        originalColors[variable] = value;
      }
    });
    
    // Store original colors in storage and cookie
    const storageKey = getStorageKey() + '_original';
    chrome.storage.local.set({ [storageKey]: originalColors });
    saveColorsToCookie(originalColors, true);
  }
  
  return originalColors;
}

// Capture original colors immediately
captureOriginalColors();

// Function to get current color values from the website
function getCurrentColors(variables) {
  const colors = {};
  variables.forEach(variable => {
    // First try to get from cache
    if (colorCache[variable]) {
      colors[variable] = colorCache[variable];
    } else {
      // If not in cache, get from computed style
      const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
      if (value) {
        colors[variable] = value;
        colorCache[variable] = value;
      }
    }
  });
  return colors;
}

// Function to update a single color
function updateColor(variable, value) {
  // Update cache
  colorCache[variable] = value;
  
  // Get current CSS rules
  const currentRules = styleElement.textContent;
  
  // Check if the variable already exists in the rules
  const variableRegex = new RegExp(`${variable}:\\s*[^;]+;`);
  
  let newRules;
  if (variableRegex.test(currentRules)) {
    // Replace existing variable
    newRules = currentRules.replace(
      variableRegex,
      `${variable}: ${value};`
    );
  } else {
    // Add new variable
    newRules = currentRules.replace(
      ':root {',
      `:root {\n  ${variable}: ${value};`
    );
  }
  
  // Update the style element
  styleElement.textContent = newRules;

  // Also update the CSS variable directly on the root element
  document.documentElement.style.setProperty(variable, value);
}

// Function to get storage key for current domain
function getStorageKey() {
  const hostname = window.location.hostname;
  return `colors_${hostname}`;
}

// Function to apply all saved colors
function applySavedColors() {
  const storageKey = getStorageKey();
  
  chrome.storage.local.get([storageKey], function(result) {
    const colors = result[storageKey] || {};
    Object.entries(colors).forEach(([variable, value]) => {
      if (value) {
        updateColor(variable, value);
      }
    });
  });
}

// Function to save colors
function saveColors(colors) {
  const storageKey = getStorageKey();
  chrome.storage.local.set({ [storageKey]: colors });
  saveColorsToCookie(colors, false);
}

// Function to load colors from cookie
function loadColorsFromCookie() {
  // First try to load current colors
  const currentColors = getColorsFromCookie(false);
  if (currentColors) {
    Object.entries(currentColors).forEach(([variable, value]) => {
      if (value) {
        updateColor(variable, value);
      }
    });
  }
  
  // Then ensure we have original colors
  if (Object.keys(originalColors).length === 0) {
    const originalCookieColors = getColorsFromCookie(true);
    if (originalCookieColors) {
      originalColors = originalCookieColors;
    } else {
      captureOriginalColors();
    }
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'updateColor') {
    updateColor(request.variable, request.value);
    saveColors(colorCache);
    sendResponse({ success: true });
  } else if (request.action === 'getCurrentColors') {
    const colors = getCurrentColors(request.variables);
    sendResponse({ colors: colors });
  } else if (request.action === 'getOriginalColors') {
    sendResponse({ colors: originalColors });
  }
  
  return true;
});

// Also capture colors when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  if (Object.keys(originalColors).length === 0) {
    captureOriginalColors();
  }
  loadColorsFromCookie();
});

// Apply colors immediately
applySavedColors();

// Also apply colors when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  applySavedColors();
});

// Apply colors when the page is fully loaded
window.addEventListener('load', function() {
  applySavedColors();
});

// Apply colors when the URL changes (for single-page applications)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    setTimeout(() => {
      captureOriginalColors();
      applySavedColors();
    }, 100);
  }
}).observe(document, { subtree: true, childList: true });

// Apply colors when the page is ready
if (document.readyState === 'loading') {
  document.addEventListener('readystatechange', function() {
    if (document.readyState === 'interactive') {
      applySavedColors();
    }
  });
} else {
  applySavedColors();
} 