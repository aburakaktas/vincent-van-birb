# Release Notes

## Version 1.3.4 (Hotfix) - March 21, 2024

### Overview
This hotfix release addresses Chrome Web Store compliance issues and improves code cleanliness. No functional changes to the extension's behavior.

### Changes
- Removed unnecessary "cookies" permission from manifest
- Removed unused `originalHoliduColors` object
- Cleaned up debugging code and console logs
- Fixed Chrome Web Store compliance issues

### Technical Details
- The extension now only requests the "storage" permission, which is required for saving color preferences
- Cookie functionality remains unchanged as it uses `document.cookie` in content scripts
- No functional changes to the extension's behavior

### Features (Unchanged)
- Color picking and customization
- Original color backup and restoration
- Cross-tab persistence
- Support for all Holidu domains and ferienwohnungen.de

### Known Issues
None

### System Requirements
- Chrome 88 or later
- Access to Holidu domains or ferienwohnungen.de

## Version 1.3.3 (2024-03-21)

### Security
- Removed unused 'scripting' permission to comply with Chrome Web Store requirements

## Version 1.3.2 (2024-03-21)

### Bug Fixes
- Fixed toggle labels to consistently show "Flip Light/Dark" across all color items

## Version 1.3.1 (2024-03-21)

### Bug Fixes
- Fixed incorrect labels in color items

## Version 1.3 (2024-03-21)

### What's New
- Removed redundant "Apply Colors" button for a cleaner UI
- Improved hex code input handling
- Enhanced keyboard support for hex fields

## Technical Improvements
- Improved paste handling for hex codes (CMD+V/Ctrl+V support)
- Enhanced keyboard input validation
- Cleaner code structure for input handling

## Bug Fixes
- Fixed hex code paste functionality
- Resolved keyboard shortcut issues on Mac

## Known Issues
- None at this time

For full documentation and feature list, please visit our [GitHub repository](https://github.com/aburakaktas/vincent-van-birb). 