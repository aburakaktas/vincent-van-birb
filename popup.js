document.addEventListener('DOMContentLoaded', function() {
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

  // Function to convert hex to RGB
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  // Function to get current color values from the website
  function getCurrentColors() {
    return new Promise((resolve) => {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (!tabs[0]) {
          console.error('Popup: No active tab found');
          resolve(originalHoliduColors);
          return;
        }

        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'getCurrentColors',
          variables: Object.values(variableMap)
        }, function(response) {
          if (chrome.runtime.lastError || !response) {
            console.error('Popup: Error getting current colors:', chrome.runtime.lastError);
            resolve(originalHoliduColors);
            return;
          }
          resolve(response.colors);
        });
      });
    });
  }

  // Function to update color in the website
  function updateColor(variable, value) {
    console.log('Popup: Attempting to send color update:', variable, value);
    
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
        console.error('Popup: No active tab found');
        return;
      }
      
      console.log('Popup: Found active tab:', tabs[0].url);
      
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'updateColor',
        variable: variable,
        value: value
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('Popup: Error sending message:', chrome.runtime.lastError);
          // Try to inject the content script if it's not already there
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content.js']
          }).then(() => {
            console.log('Popup: Content script injected, retrying color update');
            updateColor(variable, value);
          }).catch(err => {
            console.error('Popup: Failed to inject content script:', err);
          });
        } else {
          console.log('Popup: Message sent successfully');
        }
      });
    });

    // Save color to storage
    chrome.storage.sync.set({ [variable]: value }, function() {
      if (chrome.runtime.lastError) {
        console.error('Popup: Error saving to storage:', chrome.runtime.lastError);
      } else {
        console.log('Popup: Color saved to storage:', variable, value);
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
    // Add paste event listener
    input.addEventListener('paste', function(e) {
      e.preventDefault();
      const pastedText = (e.clipboardData || window.clipboardData).getData('text');
      console.log('Popup: Pasting color:', pastedText);
      
      // Try to parse the pasted text as a color
      let color = pastedText.trim();
      
      // If it's a hex color without #, add it
      if (/^[0-9A-Fa-f]{6}$/.test(color)) {
        color = '#' + color;
      }
      
      // If it's a valid color, update the input
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
        input.value = color;
        input.dispatchEvent(new Event('input'));
        console.log('Popup: Valid color pasted:', color);
      } else {
        console.log('Popup: Invalid color pasted:', pastedText);
      }
    });

    // Add keydown event listener for direct hex input
    input.addEventListener('keydown', function(e) {
      // Allow: backspace, delete, tab, escape, enter, and arrow keys
      if ([8, 9, 13, 27, 46, 37, 38, 39, 40].indexOf(e.keyCode) !== -1) {
        return;
      }
      
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      if ((e.keyCode === 65 || e.keyCode === 67 || e.keyCode === 86 || e.keyCode === 88) && e.ctrlKey) {
        return;
      }
      
      // Allow: # and hex digits
      if (e.key === '#' || /^[0-9A-Fa-f]$/.test(e.key)) {
        return;
      }
      
      // Prevent any other key
      e.preventDefault();
    });
  }

  // Function to reset colors to original Holidu values
  function resetColors() {
    console.log('Popup: Resetting colors to original Holidu values');
    Object.entries(originalHoliduColors).forEach(([variable, value]) => {
      // Find the input ID for this variable
      const inputId = Object.entries(variableMap).find(([id, v]) => v === variable)?.[0];
      if (inputId) {
        updateColorInputs(inputId, value);
        updateColor(variable, value);
      }
    });
  }

  // Function to apply all current colors
  function applyAllColors() {
    console.log('Popup: Applying all current colors');
    Object.entries(variableMap).forEach(([inputId, variable]) => {
      const colorInput = document.getElementById(inputId);
      if (colorInput) {
        updateColor(variable, colorInput.value);
      }
    });
  }

  // Initialize all color inputs
  const colorInputs = document.querySelectorAll('.color-input');
  colorInputs.forEach(input => {
    // Add paste handler
    handleColorPaste(input);

    // Add input event listener for real-time updates
    input.addEventListener('input', function() {
      console.log('Popup: Color input changed:', this.id, this.value);
      const hexInput = document.getElementById(this.id.replace('-color', '-hex'));
      if (hexInput) {
        hexInput.value = this.value;
      }
      
      const variable = variableMap[this.id];
      if (variable) {
        // Update the color in the website
        updateColor(variable, this.value);
      } else {
        console.error('Popup: No variable mapping found for input ID:', this.id);
      }
    });
  });

  // Initialize all hex inputs
  const hexInputs = document.querySelectorAll('.hex-input');
  hexInputs.forEach(input => {
    // Add paste handler
    handleColorPaste(input);

    // Add input event listener for real-time updates
    input.addEventListener('input', function() {
      console.log('Popup: Hex input changed:', this.id, this.value);
      let color = this.value.trim();
      
      // If it's a hex color without #, add it
      if (/^[0-9A-Fa-f]{6}$/.test(color)) {
        color = '#' + color;
      }
      
      // If it's a valid color, update the color picker
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
        const colorInput = document.getElementById(this.id.replace('-hex', '-color'));
        if (colorInput) {
          colorInput.value = color;
          colorInput.dispatchEvent(new Event('input'));
        }
      }
    });
  });

  // Add refresh button handler
  document.getElementById('refresh-colors').addEventListener('click', resetColors);

  // Add apply colors button handler
  document.getElementById('apply-colors').addEventListener('click', applyAllColors);

  // Load saved colors when popup opens
  chrome.storage.sync.get(Object.values(variableMap), function(result) {
    console.log('Popup: Loading saved colors:', result);
    Object.entries(result).forEach(([variable, value]) => {
      // Find the input ID for this variable
      const inputId = Object.entries(variableMap).find(([id, v]) => v === variable)?.[0];
      if (inputId) {
        updateColorInputs(inputId, value);
        console.log('Popup: Loaded saved color for', inputId, ':', value);
      }
    });
  });
}); 