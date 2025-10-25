# XML Snapshot Testing Guide

This guide explains how to capture and use XML snapshots for testing the XML-to-JSON transformation logic for XML APIs.

## Overview

The MCP ABAP ADT server handles different SAP ADT API response types:
- **XML APIs** (SearchObject, GetPackage, GetTransaction, GetTypeInfo): Return structured XML that gets transformed to JSON
- **String APIs** (GetProgram, GetTable, GetClass, GetFunction, etc.): Return raw source code/definitions as-is
- **JSON mode** (default): XML APIs return structured JSON responses
- **Raw XML mode** (RETURN_RAW_XML=true): XML APIs return original XML for testing/debugging

## Capturing Snapshots

### Prerequisites

1. Ensure your `.env` file is configured with SAP connection details:
```bash
SAP_URL=https://your-sap-system.com
SAP_USERNAME=your-username  
SAP_PASSWORD=your-password
SAP_CLIENT=100
```

2. Verify test data exists in your SAP system for XML APIs:
- `ZI_FOOTBALL_CLUBS` (for SearchObject)
- `ZMZ` (package)
- `SMI_CUST_EC` (transaction)
- `pfeapsname` (type/domain)

### Capture Process

Run the snapshot capture script:

```bash
./capture-snapshots.sh
```

Or manually:

```bash
npm run build
RETURN_RAW_XML=true npx ts-node scripts/capture-snapshots.ts
```

This will:
1. Set `RETURN_RAW_XML=true` to bypass JSON transformation
2. Call XML API handlers with test data
3. Save raw XML responses to `test/fixtures/`

### Generated Files

The capture process creates XML fixture files:

```
test/fixtures/
├── searchobject-zi-football-clubs.xml
├── getpackage-zmz.xml
├── gettransaction-smi-cust-ec.xml
└── gettypeinfo-pfeapsname.xml
```

## Running Tests

Once snapshots are captured, run the transformation tests:

```bash
npm test
```

The tests will:
1. Load XML fixtures from `test/fixtures/`
2. Apply JSON transformations using current logic
3. Validate JSON structure and content
4. Save expected JSON outputs to `test/snapshots/`

### Test Validation

Tests verify:
- **Structure**: Correct JSON schema with expected properties
- **Content**: Non-empty fields with appropriate data types
- **Completeness**: All important data extracted from XML
- **Error Handling**: Graceful handling of malformed/empty XML

## Environment Variables

### RETURN_RAW_XML

Controls response format for XML APIs only:

- `RETURN_RAW_XML=false` (default): XML APIs return JSON, String APIs return raw content
- `RETURN_RAW_XML=true`: XML APIs return raw XML, String APIs still return raw content

**Usage:**
```bash
# For normal operation (JSON for XML APIs, raw for String APIs)
RETURN_RAW_XML=false npm run start:http

# For capturing snapshots (raw XML for XML APIs)  
RETURN_RAW_XML=true npx ts-node scripts/capture-snapshots.ts
```

## Troubleshooting

### Connection Issues

If snapshot capture fails:

1. Verify SAP connection:
```bash
curl -u username:password "https://your-sap-system/sap/bc/adt/discovery"
```

2. Check `.env` configuration
3. Ensure SAP client allows ADT access
4. Verify test data exists in the system

### Missing Test Data

If specific objects don't exist:

1. Update test data in `scripts/capture-snapshots.ts`
2. Use objects that exist in your system
3. Maintain consistent naming for fixtures

### Test Failures

If transformation tests fail:

1. Check XML fixture validity
2. Update transformation logic in `src/lib/utils.ts`
3. Review JSON structure expectations
4. Update test assertions if needed

## Development Workflow

1. **Capture snapshots** when:
   - Adding new handlers
   - Changing transformation logic
   - SAP system structure changes

2. **Run tests** to verify:
   - Transformations work correctly
   - No regressions introduced
   - JSON output quality

3. **Update snapshots** when:
   - SAP system data changes
   - New test cases added
   - XML structure evolves

## File Structure

```
├── scripts/
│   └── capture-snapshots.ts      # Snapshot capture utility
├── test/
│   ├── fixtures/                 # Raw XML snapshots
│   ├── snapshots/                # Expected JSON outputs  
│   └── transformation.test.ts    # Transformation tests
├── src/lib/
│   └── utils.ts                  # Transformation functions
├── capture-snapshots.sh          # Helper script
├── .env.example                  # Environment template
└── README-snapshots.md           # This guide
```
