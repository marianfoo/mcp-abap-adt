#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

// Import shared server creation function
import { createMcpServer } from './lib/server';

/**
 * Server class for interacting with ABAP systems via ADT using stdio transport.
 */
export class mcp_abap_adt_server {
  private server;

  /**
   * Constructor for the mcp_abap_adt_server class.
   */
  constructor() {
    this.server = createMcpServer(); // Create configured MCP server

    // Handle server shutdown on SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Starts the MCP server and connects it to the stdio transport.
   */
  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}

// Create and run the server
const server = new mcp_abap_adt_server();
server.run().catch((error) => {
  process.exit(1);
});
