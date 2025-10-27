import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';
import dotenv from 'dotenv';

// Import handler functions
import { handleGetProgram } from '../handlers/handleGetProgram';
import { handleGetClass } from '../handlers/handleGetClass';
import { handleGetFunctionGroup } from '../handlers/handleGetFunctionGroup';
import { handleGetFunction } from '../handlers/handleGetFunction';
import { handleGetTable } from '../handlers/handleGetTable';
import { handleGetStructure } from '../handlers/handleGetStructure';
import { handleGetTableContents } from '../handlers/handleGetTableContents';
import { handleGetPackage } from '../handlers/handleGetPackage';
import { handleGetInclude } from '../handlers/handleGetInclude';
import { handleGetTypeInfo } from '../handlers/handleGetTypeInfo';
import { handleGetInterface } from '../handlers/handleGetInterface';
import { handleGetTransaction } from '../handlers/handleGetTransaction';
import { handleSearchObject } from '../handlers/handleSearchObject';
import { handleGetCdsView } from '../handlers/handleCdsOperations';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Interface for SAP configuration
export interface SapConfig {
  url: string;
  username: string;
  password: string;
  client: string;
}

/**
 * Retrieves SAP configuration from environment variables.
 *
 * @returns {SapConfig} The SAP configuration object.
 * @throws {Error} If any required environment variable is missing.
 */
export function getConfig(): SapConfig {
  const url = process.env.SAP_URL;
  const username = process.env.SAP_USERNAME;
  const password = process.env.SAP_PASSWORD;
  const client = process.env.SAP_CLIENT;

  // Check if all required environment variables are set
  if (!url || !username || !password || !client) {
    throw new Error(`Missing required environment variables. Required variables:
- SAP_URL
- SAP_USERNAME
- SAP_PASSWORD
- SAP_CLIENT`);
  }

  return { url, username, password, client };
}

/**
 * Creates and configures an MCP server with all ABAP ADT tools.
 * This function is shared between stdio and HTTP transports.
 * 
 * @returns {Server} Configured MCP server instance
 */
export function createMcpServer(): Server {
  // Validate SAP configuration on server creation
  getConfig();

  const server = new Server(
    {
      name: 'mcp-abap-adt',
      version: '1.2.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Setup tool handlers
  setupHandlers(server);

  return server;
}

/**
 * Sets up request handlers for listing and calling tools.
 * @private
 */
function setupHandlers(server: Server) {
  // Handler for ListToolsRequest
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'GetProgram',
          description: 'Retrieve ABAP program source code',
          inputSchema: {
            type: 'object',
            properties: {
              program_name: {
                type: 'string',
                description: 'Name of the ABAP program'
              }
            },
            required: ['program_name']
          }
        },
        {
          name: 'GetClass',
          description: 'Retrieve ABAP class source code',
          inputSchema: {
            type: 'object',
            properties: {
              class_name: {
                type: 'string',
                description: 'Name of the ABAP class'
              }
            },
            required: ['class_name']
          }
        },
        {
          name: 'GetFunctionGroup',
          description: 'Retrieve ABAP Function Group source code',
          inputSchema: {
            type: 'object',
            properties: {
              function_group: {
                type: 'string',
                description: 'Name of the function module'
              }
            },
            required: ['function_group']
          }
        },
        {
          name: 'GetFunction',
          description: 'Retrieve ABAP Function Module source code',
          inputSchema: {
            type: 'object',
            properties: {
              function_name: {
                type: 'string',
                description: 'Name of the function module'
              },
              function_group: {
                type: 'string',
                description: 'Name of the function group'
              }
            },
            required: ['function_name', 'function_group']
          }
        },
        {
          name: 'GetStructure',
          description: 'Retrieve ABAP Structure',
          inputSchema: {
            type: 'object',
            properties: {
              structure_name: {
                type: 'string',
                description: 'Name of the ABAP Structure'
              }
            },
            required: ['structure_name']
          }
        },
        {
          name: 'GetTable',
          description: 'Retrieve ABAP table structure',
          inputSchema: {
            type: 'object',
            properties: {
              table_name: {
                type: 'string',
                description: 'Name of the ABAP table'
              }
            },
            required: ['table_name']
          }
        },
        {
          name: 'GetTableContents',
          description: 'Retrieve contents of an ABAP table',
          inputSchema: {
            type: 'object',
            properties: {
              table_name: {
                type: 'string',
                description: 'Name of the ABAP table'
              },
              max_rows: {
                type: 'number',
                description: 'Maximum number of rows to retrieve',
                default: 100
              }
            },
            required: ['table_name']
          }
        },
        {
          name: 'GetPackage',
          description: 'Retrieve ABAP package details',
          inputSchema: {
            type: 'object',
            properties: {
              package_name: {
                type: 'string',
                description: 'Name of the ABAP package'
              }
            },
            required: ['package_name']
          }
        },
        {
          name: 'GetTypeInfo',
          description: 'Retrieve ABAP type information',
          inputSchema: {
            type: 'object',
            properties: {
              type_name: {
                type: 'string',
                description: 'Name of the ABAP type'
              }
            },
            required: ['type_name']
          }
        },
        {
          name: 'GetInclude',
          description: 'Retrieve ABAP Include Source Code',
          inputSchema: {
            type: 'object',
            properties: {
              include_name: {
                type: 'string',
                description: 'Name of the ABAP Include'
              }
            },
            required: ['include_name']
          }
        },
        {
          name: 'SearchObject',
          description: 'Search for ABAP objects using quick search',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query string (use * wildcard for partial match)'
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results to return',
                default: 100
              }
            },
            required: ['query']
          }
        },
        {
          name: 'GetTransaction',
          description: 'Retrieve ABAP transaction details',
          inputSchema: {
            type: 'object',
            properties: {
              transaction_name: {
                type: 'string',
                description: 'Name of the ABAP transaction'
              }
            },
            required: ['transaction_name']
          }
        },
        {
          name: 'GetInterface',
          description: 'Retrieve ABAP interface source code',
          inputSchema: {
            type: 'object',
            properties: {
              interface_name: {
                type: 'string',
                description: 'Name of the ABAP interface'
              }
            },
            required: ['interface_name']
          }
        },
        {
          name: 'GetCdsView',
          description: 'Retrieve CDS view structure and properties',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Name or path of the CDS view'
              },
              getTargetForAssociation: {
                type: 'boolean',
                description: 'Get target for association',
                default: false
              },
              getExtensionViews: {
                type: 'boolean',
                description: 'Get extension views',
                default: true
              },
              getSecondaryObjects: {
                type: 'boolean',
                description: 'Get secondary objects',
                default: true
              }
            },
            required: ['path']
          }
        }
      ]
    };
  });

  // Handler for CallToolRequest
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
      case 'GetProgram':
        return await handleGetProgram(request.params.arguments);
      case 'GetClass':
        return await handleGetClass(request.params.arguments);
      case 'GetFunction':
        return await handleGetFunction(request.params.arguments);
      case 'GetFunctionGroup':
        return await handleGetFunctionGroup(request.params.arguments);
      case 'GetStructure':
        return await handleGetStructure(request.params.arguments);
      case 'GetTable':
        return await handleGetTable(request.params.arguments);
      case 'GetTableContents':
        return await handleGetTableContents(request.params.arguments);
      case 'GetPackage':
        return await handleGetPackage(request.params.arguments);
      case 'GetTypeInfo':
        return await handleGetTypeInfo(request.params.arguments);
      case 'GetInclude':
        return await handleGetInclude(request.params.arguments);
      case 'SearchObject':
        return await handleSearchObject(request.params.arguments);
      case 'GetInterface':
        return await handleGetInterface(request.params.arguments);
      case 'GetTransaction':
        return await handleGetTransaction(request.params.arguments);
      case 'GetCdsView':
        return await handleGetCdsView(request.params.arguments);
      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${request.params.name}`
        );
    }
  });
}
