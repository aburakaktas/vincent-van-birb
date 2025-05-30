# Changelog

All notable changes to the "Vincent van Birb" extension will be documented in this file.

## [1.3.4] - 2024-03-21
### Changed
- Removed unnecessary "cookies" permission from manifest
- Removed unused `originalHoliduColors` object
- Cleaned up debugging code and console logs
- Fixed Chrome Web Store compliance issues

## [1.3.3] - 2024-03-20
### Added
- Support for all Holidu domains
- Support for ferienwohnungen.de
- Color persistence across tabs
- Original color backup and restoration
- Cookie-based backup of original colors

### Fixed
- Fixed feedback loop causing flickering
- Fixed color changes only being stored per tab
- Fixed recursion bug in cookie loading logic

## [1.3.2] - 2024-03-21

### Fixed
- Fixed toggle labels to consistently show "Flip Light/Dark"

## [1.3.1] - 2024-03-21

### Fixed
- Fixed incorrect labels in color items

## [1.3] - 2024-03-21

### Changed
- Removed redundant "Apply Colors" button for cleaner UI
- Improved hex input paste handling with better CMD+V/Ctrl+V support
- Enhanced keyboard input validation for hex fields

## [1.2] - 2024-03-21

### Added
- Color persistence using cookies and local storage
- Original color display and revert functionality
- Support for all Holidu domain variations

### Fixed
- Content security policy configuration
- Web accessible resources configuration

## [1.1] - 2024-03-21

### Changed
- Renamed extension from "Birb Gogh" to "Vincent van Birb"
- Updated manifest.json with improved icon specifications
- Enhanced README with clearer installation instructions
- Improved extension description

## [1.0] - 2024-03-20

### Added
- Initial release
- Color picker functionality
- WCAG contrast checker
- Light/Dark mode toggle
- Color saving and reset features 