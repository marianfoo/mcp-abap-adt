# CDS API Usage Guide

This document describes how to use the Core Data Services (CDS) API that has been added to the ABAP ADT MCP Server.

## Available CDS Tool

### GetCdsView
**Purpose**: Retrieve CDS view structure, properties, and metadata

**Usage**:
```json
{
  "name": "GetCdsView",
  "arguments": {
    "path": "YOUR_CDS_VIEW_NAME",
    "getTargetForAssociation": false,
    "getExtensionViews": true,
    "getSecondaryObjects": true
  }
}
```

**Parameters**:
- `path` (required): Name or path of the CDS view
- `getTargetForAssociation` (optional, default: false): Get target for association
- `getExtensionViews` (optional, default: true): Get extension views
- `getSecondaryObjects` (optional, default: true): Get secondary objects

**Response**: Returns detailed CDS view information including:
- Element type and name
- Properties (data element, data type, length, labels, etc.)
- Annotations
- Child elements and nested structures
- Field metadata and properties

## Example Use Cases

### 1. Get Basic CDS View Structure
Retrieve the structure and field information of a CDS view:

```json
{
  "name": "GetCdsView",
  "arguments": {
    "path": "Z_CUSTOMER_VIEW"
  }
}
```

### 2. Get Detailed CDS View with Associations
Retrieve CDS view structure including association targets:

```json
{
  "name": "GetCdsView",
  "arguments": {
    "path": "Z_SALES_VIEW",
    "getTargetForAssociation": true,
    "getExtensionViews": true
  }
}
```

### 3. Analyze CDS View Fields and Annotations
Get comprehensive information about field properties and annotations:

```json
{
  "name": "GetCdsView",
  "arguments": {
    "path": "I_CUSTOMER",
    "getSecondaryObjects": true
  }
}
```

## Error Handling

All CDS tools follow the standard MCP server error handling pattern:
- Successful responses include `isError: false` and `content` array
- Failed responses include `isError: true` and error details in `content`

## Implementation Notes

- All CDS tools are read-only operations
- The tools use the existing SAP ADT authentication and connection infrastructure
- XML responses are automatically parsed and converted to JSON for easier consumption
- Headers for specific SAP ADT endpoints are handled internally
- The tools follow the same patterns as other ABAP ADT tools in the server

## Prerequisites

- Valid SAP system connection configured via environment variables
- Proper SAP user permissions for CDS/DDIC access
- SAP system with ADT endpoints enabled
- CDS development tools available in the target SAP system
