# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-10-27

### Added
- New `GetCdsView` tool to retrieve CDS view structure and properties.
  - Supports getting target for association, extension views, and secondary objects
  - Uses CDS operations API for comprehensive view information
  - Added to README.md documentation

### Changed
- Enhanced API response handling with JSON transformation capabilities
  - Added `RETURN_RAW_XML` environment variable to control response format
  - Default JSON responses for better MCP client compatibility
  - Raw XML mode available for testing and debugging
- Improved XML parsing utilities with robust error handling
- Added comprehensive test infrastructure with snapshot testing
- Enhanced CSRF token handling for POST/PUT requests
- Updated server version to match package.json version (1.1.0)

### Fixed
- Corrected API response type handling (XML vs String APIs)
- Improved error messages for missing custom services
- Enhanced session and cookie management

## [1.1.0] - 2025-02-19

### Added
- New `GetTransaction` tool to retrieve ABAP transaction details.
  - Allows fetching transaction details using the ADT endpoint `/sap/bc/adt/repository/informationsystem/objectproperties/values`.
  - Added documentation in README.md.

## [0.1.2] - 2025-02-18

### Changed
- Added Jest Test Script `index.test.ts` available through `npm test`
- Enhanced `makeAdtRequest` method to support:
  - Custom headers through an optional parameter
  - Query parameters through an optional `params` parameter
- Improved `handleGetPackage` method to use ADT's nodeContent API
  - Now uses POST request with proper XML payload
  - Added specific content type headers for nodeContent endpoint
  - Added filtering to return only objects with URI 
- Improved CSRF token handling in utils.ts
  - Added automatic CSRF token fetching for POST/PUT requests
  - Enhanced token extraction to work with error responses
  - Added cookie management for better session handling
  - Implemented singleton axios instance for consistent state
  - Added proper cleanup for test environments

## [0.1.1] - 2025-02-13

### Added
- New `GetInterface` tool to retrieve ABAP interface source code
  - Allows fetching source code of ABAP interfaces using the ADT endpoint `/sap/bc/adt/oo/interfaces/`
  - Similar functionality to GetClass but for interfaces
  - Added documentation in README.md

## [0.1.0] - Initial Release

### Added
- Initial release of the MCP ABAP ADT server
- Basic ABAP object retrieval functionality
- Support for programs, classes, function modules, and more
- Documentation and setup instructions
