// Map input IDs to CSS variable names
const variableMap = {
  'primary-color': '--color-primary',
  'primary-dark-color': '--color-primary-dark',
  'cta-color': '--color-cta',
  'cta-active-color': '--color-cta-active',
  'cta-text-color': '--color-cta-text',
  'error-color': '--color-error',
  'confirmation-green-color': '--color-confirmation-green',
  'dark-mode-color': '--color-black-text',
  // Add ferienwohnungen.de specific variables
  'fw-primary-color': '--fw-primary',
  'fw-primary-dark-color': '--fw-primary-dark',
  'fw-cta-color': '--fw-cta',
  'fw-cta-active-color': '--fw-cta-active',
  'fw-cta-text-color': '--fw-cta-text',
  'fw-error-color': '--fw-error',
  'fw-success-color': '--fw-success',
  'fw-success-light-color': '--fw-success-light'
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
      return;
    }
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'updateColor',
      variable: variable,
      value: value
    }, function(response) {
      if (chrome.runtime.lastError) {
        setTimeout(() => {
          updateColor(variable, value);
        }, 100);
      }
    });
  });
  // Save color to storage
  const storageKey = getStorageKey();
  chrome.storage.local.get([storageKey], (result) => {
    const colors = result[storageKey] || {};
    colors[variable] = value;
    chrome.storage.local.set({ [storageKey]: colors }, function() {
    });
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
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    let color = pastedText.trim();
    
    // Handle various hex code formats
    if (color.startsWith('#')) {
      color = color.substring(1);
    }
    
    // If it's a valid 6-digit hex code
    if (/^[0-9A-Fa-f]{6}$/.test(color)) {
      e.preventDefault();
      color = '#' + color;
      input.value = color;
      input.dispatchEvent(new Event('input'));
    }
  });

  // Allow all keyboard input for hex fields
  if (input.classList.contains('hex-input')) {
    input.addEventListener('keydown', function(e) {
      // Allow: backspace, delete, tab, escape, enter, arrows
      if ([8, 9, 13, 27, 46, 37, 38, 39, 40].indexOf(e.keyCode) !== -1) return;
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if ((e.keyCode === 65 || e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 88) && (e.ctrlKey || e.metaKey)) return;
      // Allow: # and hex characters
      if (e.key === '#' || /^[0-9A-Fa-f]$/.test(e.key)) return;
      e.preventDefault();
    });
  }
}

// Function to reset colors to original values
function resetColors() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs[0]) {
      return;
    }
    // First get original colors from the page
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'getOriginalColors'
    }, function(response) {
      if (chrome.runtime.lastError) {
        return;
      }
      if (response && response.colors) {
        // Update original colors in storage
        const storageKey = getStorageKey() + '_original';
        chrome.storage.local.set({ [storageKey]: response.colors }, function() {
          if (chrome.runtime.lastError) {
            return;
          }
          // Then update the UI and website with original colors
          Object.entries(response.colors).forEach(([variable, value]) => {
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
        });
      }
    });
  });
}

// Function to update contrast info
function updateContrastInfo(colorId, colorValue) {
  const contrastInfo = document.getElementById(`${colorId}-contrast`);
  if (!contrastInfo) return;

  // Ensure color value is in correct format
  if (!colorValue.startsWith('#')) {
    colorValue = '#' + colorValue;
  }
  
  // Get the black text color
  const blackTextColor = document.getElementById('dark-mode-color')?.value || '#2b2926';
  
  // Calculate contrast with white and black text color
  const whiteContrast = calculateContrastRatio('#FFFFFF', colorValue);
  const blackContrast = calculateContrastRatio(blackTextColor, colorValue);
  
  // Get WCAG compliance for both scenarios
  const whiteCompliance = checkWCAGCompliance(whiteContrast);
  const blackCompliance = checkWCAGCompliance(blackContrast);
  
  // Update the contrast ratio displays
  const lightRatio = contrastInfo.querySelector('.light-ratio');
  const darkRatio = contrastInfo.querySelector('.dark-ratio');
  if (lightRatio) lightRatio.textContent = whiteContrast.toFixed(2);
  if (darkRatio) darkRatio.textContent = blackContrast.toFixed(2);
  
  // Update WCAG status
  const wcagStatus = contrastInfo.querySelector('.wcag-status');
  const modeToggle = contrastInfo.closest('.color-item').querySelector('.mode-switch');
  const isDarkMode = modeToggle ? modeToggle.checked : false;
  
  // Update the preview boxes based on current mode
  const previews = contrastInfo.querySelectorAll('.contrast-box');
  if (previews.length >= 2) {
    if (isDarkMode) {
      // Dark mode: black text on primary + primary on black text
      previews[0].innerHTML = '<span>A</span>';
      previews[0].style.backgroundColor = colorValue;
      previews[0].style.color = blackTextColor;
      
      previews[1].innerHTML = '<span>A</span>';
      previews[1].style.backgroundColor = blackTextColor;
      previews[1].style.color = colorValue;
      
      if (lightRatio) lightRatio.style.display = 'none';
      if (darkRatio) darkRatio.style.display = 'block';
      
      if (wcagStatus) {
        wcagStatus.innerHTML = `
          <div class="wcag-level">AA: <span class="status">${blackCompliance.AA.normal ? '✅' : '❌'}</span></div>
          <div class="wcag-level">AAA: <span class="status">${blackCompliance.AAA.normal ? '✅' : '❌'}</span></div>
        `;
      }
    } else {
      // Light mode: white on primary + primary on white
      previews[0].innerHTML = 'A';
      previews[0].style.backgroundColor = colorValue;
      previews[0].style.color = '#FFFFFF';
      
      previews[1].innerHTML = '<span>A</span>';
      previews[1].style.backgroundColor = '#FFFFFF';
      previews[1].style.color = colorValue;
      
      if (lightRatio) lightRatio.style.display = 'block';
      if (darkRatio) darkRatio.style.display = 'none';
      
      if (wcagStatus) {
        wcagStatus.innerHTML = `
          <div class="wcag-level">AA: <span class="status">${whiteCompliance.AA.normal ? '✅' : '❌'}</span></div>
          <div class="wcag-level">AAA: <span class="status">${whiteCompliance.AAA.normal ? '✅' : '❌'}</span></div>
        `;
      }
    }
  }

  // Update the CSS variable for the current color
  contrastInfo.style.setProperty('--current-color', colorValue);
}

// Function to update all contrast displays
function updateAllContrastDisplays() {
  const colorInputs = document.querySelectorAll('.color-input');
  colorInputs.forEach(input => {
    // Skip the black text color input itself
    if (input.id !== 'dark-mode-color') {
      const colorId = input.id.replace('-color', '');
      updateContrastInfo(colorId, input.value);
    }
  });
}

// Random quote selection
const quotes = [
  "I dream in hex codes, then color the page.",
  "Designers be like: \"What if the button was just… a different blue?\"",
  "Live, laugh, love… and tweak that error red again.",
  "What would Holidu look like in peach?",
  "Me: It's just a small color test.<br>Devs: 😨😨😨",
  "One does not simply change the primary color.",
  "Me: Just tweaking the success green.<br>Also me: Introduces brand-wide identity crisis.",
  "CTA yellow felt cute, might revert later.",
  "It looked good on my monitor…"
];

function setRandomQuote() {
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  document.getElementById('random-quote').innerHTML = randomQuote;
}

// Set initial quote
setRandomQuote();

// Listen for window focus changes
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    setRandomQuote();
  }
});

// Function to get the current domain
function getCurrentDomain() {
  return window.location.hostname;
}

// Function to get the storage key based on domain
function getStorageKey() {
  const domain = getCurrentDomain();
  if (domain.includes('holidu.com')) {
    return 'holidu_colors';
  } else if (domain.includes('ferienwohnungen.de')) {
    return 'ferienwohnungen_colors';
  }
  return 'holidu_colors'; // Default to holidu
}

// Function to load current colors from storage
function loadCurrentColors() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs[0]) return;
    // First get original colors
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'getOriginalColors'
    }, function(response) {
      if (chrome.runtime.lastError) {
        return;
      }
      if (response && response.colors) {
        // Update original colors with server values
        const storageKey = getStorageKey() + '_original';
        chrome.storage.local.set({ [storageKey]: response.colors });
      }
      // Then get current colors
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'getCurrentColors',
        variables: Object.values(variableMap)
      }, function(response) {
        if (chrome.runtime.lastError) {
          return;
        }
        if (response && response.colors) {
          Object.entries(response.colors).forEach(([variable, value]) => {
            const inputId = Object.entries(variableMap).find(([id, v]) => v === variable)?.[0];
            if (inputId) {
              updateColorInputs(inputId, value);
              updateContrastInfo(inputId.replace('-color', ''), value);
            }
          });
        }
      });
    });
  });
}

// Initialize when the popup loads
document.addEventListener('DOMContentLoaded', function() {
  // Load current colors first
  loadCurrentColors();

  // Initialize color inputs
  const colorInputs = document.querySelectorAll('.color-input');
  
  colorInputs.forEach(input => {
    handleColorPaste(input);
    input.addEventListener('input', function() {
      const hexInput = document.getElementById(this.id.replace('-color', '-hex'));
      if (hexInput) {
        hexInput.value = this.value;
      }
      
      const variable = variableMap[this.id];
      if (variable) {
        updateColor(variable, this.value);
        // If this is the black text color, update all contrast displays
        if (this.id === 'dark-mode-color') {
          updateAllContrastDisplays();
        } else {
          updateContrastInfo(this.id.replace('-color', ''), this.value);
        }
      }
    });
  });

  // Initialize hex inputs
  const hexInputs = document.querySelectorAll('.hex-input');
  
  hexInputs.forEach(input => {
    handleColorPaste(input);
    input.addEventListener('input', function() {
      let color = this.value.trim();
      
      if (/^[0-9A-Fa-f]{6}$/.test(color)) {
        color = '#' + color;
      }
      
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
        const colorInput = document.getElementById(this.id.replace('-hex', '-color'));
        if (colorInput) {
          colorInput.value = color;
          // If this is the black text color, update all contrast displays
          if (this.id === 'dark-mode-hex') {
            updateAllContrastDisplays();
          }
          colorInput.dispatchEvent(new Event('input'));
        }
      }
    });
  });

  // Initialize contrast information for all colors
  colorInputs.forEach(input => {
    const colorId = input.id.replace('-color', '');
    updateContrastInfo(colorId, input.value);
  });

  // Initialize mode toggles
  document.querySelectorAll('.mode-switch').forEach(toggle => {
    toggle.addEventListener('change', function() {
      const colorItem = this.closest('.color-item');
      const colorInput = colorItem.querySelector('.color-input');
      const colorId = colorInput.id.replace('-color', '');
      updateContrastInfo(colorId, colorInput.value);
    });
  });

  // Add button handlers
  document.getElementById('refresh-colors').addEventListener('click', resetColors);
}); 