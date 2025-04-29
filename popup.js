console.log('popup.js loaded');

// Original Holidu color values (these never change)
const originalHoliduColors = {
  '--color-primary': '#00809D',
  '--color-primary-dark': '#024251',
  '--color-cta': '#ff6064',
  '--color-cta-active': '#ff3a3d',
  '--color-cta-hover': '#024251',
  '--color-cta-text': '#FFFFFF',
  '--color-error': '#d73900',
  '--color-confirmation-green': '#038600',
  '--color-confirmation-green-light': 'rgba(3, 134, 0, 0.1)'
};

// Map input IDs to CSS variable names
const variableMap = {
  'primary-color': '--color-primary',
  'primary-dark-color': '--color-primary-dark',
  'cta-color': '--color-cta',
  'cta-active-color': '--color-cta-active',
  'cta-hover-color': '--color-cta-hover',
  'cta-text-color': '--color-cta-text',
  'error-color': '--color-error',
  'confirmation-green-color': '--color-confirmation-green'
};

// Color contrast calculation functions
function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function calculateContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 0;
  
  const l1 = luminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = luminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

function checkWCAGCompliance(contrastRatio, isLargeText = false) {
  const results = {
    AA: {
      normal: contrastRatio >= 4.5,
      large: contrastRatio >= 3
    },
    AAA: {
      normal: contrastRatio >= 7,
      large: contrastRatio >= 4.5
    }
  };
  
  return results;
}

// Function to update color in the website
function updateColor(variable, value) {
  console.log('Updating color:', variable, value);
  
  // If this is the confirmation green color, also update the light version
  if (variable === '--color-confirmation-green') {
    const rgb = hexToRgb(value);
    if (rgb) {
      const lightValue = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`;
      updateColor('--color-confirmation-green-light', lightValue);
    }
  }
  
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs[0]) {
      console.error('No active tab found');
      return;
    }
    
    console.log('Found active tab:', tabs[0].url);
    
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'updateColor',
      variable: variable,
      value: value
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error('Error sending message:', chrome.runtime.lastError);
        // Try to inject the content script if it's not already there
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content.js']
        }).then(() => {
          console.log('Content script injected, retrying color update');
          updateColor(variable, value);
        }).catch(err => {
          console.error('Failed to inject content script:', err);
        });
      } else {
        console.log('Color update message sent successfully');
      }
    });
  });

  // Save color to storage
  chrome.storage.sync.set({ [variable]: value }, function() {
    if (chrome.runtime.lastError) {
      console.error('Error saving to storage:', chrome.runtime.lastError);
    } else {
      console.log('Color saved to storage:', variable, value);
    }
  });
}

// Function to update hex input and color picker
function updateColorInputs(colorId, value) {
  const colorInput = document.getElementById(colorId);
  const hexInput = document.getElementById(colorId.replace('-color', '-hex'));
  
  if (colorInput && hexInput) {
    colorInput.value = value;
    hexInput.value = value;
  }
}

// Function to handle color input paste
function handleColorPaste(input) {
  input.addEventListener('paste', function(e) {
    e.preventDefault();
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    let color = pastedText.trim();
    
    if (/^[0-9A-Fa-f]{6}$/.test(color)) {
      color = '#' + color;
    }
    
    if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
      input.value = color;
      input.dispatchEvent(new Event('input'));
    }
  });

  input.addEventListener('keydown', function(e) {
    if ([8, 9, 13, 27, 46, 37, 38, 39, 40].indexOf(e.keyCode) !== -1) return;
    if ((e.keyCode === 65 || e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 88) && e.ctrlKey) return;
    if (e.key === '#' || /^[0-9A-Fa-f]$/.test(e.key)) return;
    e.preventDefault();
  });
}

// Function to reset colors to original Holidu values
function resetColors() {
  console.log('Resetting colors to original values');
  Object.entries(originalHoliduColors).forEach(([variable, value]) => {
    const inputId = Object.entries(variableMap).find(([id, v]) => v === variable)?.[0];
    if (inputId) {
      // Update the UI
      const colorInput = document.getElementById(inputId);
      const hexInput = document.getElementById(inputId.replace('-color', '-hex'));
      if (colorInput && hexInput) {
        colorInput.value = value;
        hexInput.value = value;
        // Update contrast information
        updateContrastInfo(inputId.replace('-color', ''), value);
      }
      // Update the website
      updateColor(variable, value);
    }
  });
}

// Function to apply all current colors
function applyAllColors() {
  Object.entries(variableMap).forEach(([inputId, variable]) => {
    const colorInput = document.getElementById(inputId);
    if (colorInput) {
      updateColor(variable, colorInput.value);
    }
  });
}

function updateContrastInfo(colorId, colorValue) {
  console.log('Updating contrast for:', colorId, colorValue);
  const contrastInfo = document.getElementById(`${colorId}-contrast`);
  if (!contrastInfo) {
    console.error('Contrast info element not found for:', colorId);
    return;
  }

  // Ensure color value is in correct format
  if (!colorValue.startsWith('#')) {
    colorValue = '#' + colorValue;
  }
  
  // Calculate both contrast scenarios
  const whiteTextOnColor = calculateContrastRatio('#FFFFFF', colorValue);
  const colorTextOnWhite = calculateContrastRatio(colorValue, '#FFFFFF');
  
  console.log('Contrast ratios:', {
    whiteTextOnColor,
    colorTextOnWhite
  });
  
  // Get WCAG compliance for both scenarios
  const whiteTextCompliance = checkWCAGCompliance(whiteTextOnColor);
  const colorTextCompliance = checkWCAGCompliance(colorTextOnWhite);
  
  // Update the UI with both scenarios
  contrastInfo.innerHTML = `
    <div class="contrast-scenario">
      <div class="scenario-title">White text on ${colorId} background:</div>
      <div class="contrast-ratio">Contrast Ratio: <span>${whiteTextOnColor.toFixed(2)}</span></div>
      <div class="wcag-status">
        <div class="wcag-level">AA: <span class="status">${whiteTextCompliance.AA.normal ? '✅' : '❌'}</span></div>
        <div class="wcag-level">AAA: <span class="status">${whiteTextCompliance.AAA.normal ? '✅' : '❌'}</span></div>
      </div>
    </div>
    <div class="contrast-scenario">
      <div class="scenario-title">${colorId} text on white background:</div>
      <div class="contrast-ratio">Contrast Ratio: <span>${colorTextOnWhite.toFixed(2)}</span></div>
      <div class="wcag-status">
        <div class="wcag-level">AA: <span class="status">${colorTextCompliance.AA.normal ? '✅' : '❌'}</span></div>
        <div class="wcag-level">AAA: <span class="status">${colorTextCompliance.AAA.normal ? '✅' : '❌'}</span></div>
      </div>
    </div>
  `;
}

// Initialize when the popup loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded - Initializing popup');
  
  // Initialize color inputs
  const colorInputs = document.querySelectorAll('.color-input');
  console.log('Found color inputs:', colorInputs.length);
  
  colorInputs.forEach(input => {
    console.log('Initializing color input:', input.id);
    handleColorPaste(input);
    input.addEventListener('input', function() {
      console.log('Color input changed:', this.id, this.value);
      const hexInput = document.getElementById(this.id.replace('-color', '-hex'));
      if (hexInput) {
        hexInput.value = this.value;
      }
      
      const variable = variableMap[this.id];
      if (variable) {
        updateColor(variable, this.value);
        updateContrastInfo(this.id.replace('-color', ''), this.value);
      }
    });
  });

  // Initialize hex inputs
  const hexInputs = document.querySelectorAll('.hex-input');
  console.log('Found hex inputs:', hexInputs.length);
  
  hexInputs.forEach(input => {
    console.log('Initializing hex input:', input.id);
    handleColorPaste(input);
    input.addEventListener('input', function() {
      console.log('Hex input changed:', this.id, this.value);
      let color = this.value.trim();
      
      if (/^[0-9A-Fa-f]{6}$/.test(color)) {
        color = '#' + color;
      }
      
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
        const colorInput = document.getElementById(this.id.replace('-hex', '-color'));
        if (colorInput) {
          colorInput.value = color;
          colorInput.dispatchEvent(new Event('input'));
        }
      }
    });
  });

  // Initialize contrast information for all colors
  console.log('Initializing contrast information');
  colorInputs.forEach(input => {
    const colorId = input.id.replace('-color', '');
    console.log('Initializing contrast for:', colorId, input.value);
    updateContrastInfo(colorId, input.value);
  });

  // Add button handlers
  document.getElementById('refresh-colors').addEventListener('click', function() {
    console.log('Reset button clicked');
    resetColors();
  });
  
  document.getElementById('apply-colors').addEventListener('click', function() {
    console.log('Apply button clicked');
    applyAllColors();
  });

  // Load saved colors
  chrome.storage.sync.get(Object.values(variableMap), function(result) {
    console.log('Loading saved colors:', result);
    Object.entries(result).forEach(([variable, value]) => {
      const inputId = Object.entries(variableMap).find(([id, v]) => v === variable)?.[0];
      if (inputId) {
        updateColorInputs(inputId, value);
        updateContrastInfo(inputId.replace('-color', ''), value);
      }
    });
  });
}); 