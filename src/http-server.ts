#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

// Import shared server creation function
import { createMcpServer } from './lib/server';

// Configuration
const MCP_PORT = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 3234;

// Express app setup
const app = express();
app.use(express.json());

// CORS configuration to expose MCP session headers
app.use(cors({
  origin: '*', // Allow all origins - adjust as needed for production
  exposedHeaders: ['Mcp-Session-Id']
}));

// Map to store transports by session ID for stateful connections
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

/**
 * Handles MCP POST requests for JSON-RPC communication
 */
const mcpPostHandler = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  
  if (sessionId) {
    console.log(`Received MCP request for session: ${sessionId}`);
  } else {
    console.log('Received new MCP request:', req.body?.method || 'unknown method');
  }

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing transport for this session
      transport = transports[sessionId];
    } else if (!sessionId && req.body?.method === 'initialize') {
      // New initialization request - create new transport
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId: string) => {
          // Store the transport by session ID when session is initialized
          console.log(`Session initialized with ID: ${newSessionId}`);
          transports[newSessionId] = transport;
        },
        onsessionclosed: (closedSessionId: string) => {
          // Clean up transport when session is closed
          console.log(`Session closed: ${closedSessionId}`);
          if (transports[closedSessionId]) {
            delete transports[closedSessionId];
          }
        }
      });

      // Set up onclose handler to clean up transport when closed
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          console.log(`Transport closed for session ${sid}, removing from transports map`);
          delete transports[sid];
        }
      };

      // Connect the transport to the MCP server BEFORE handling the request
      const server = createMcpServer();
      await server.connect(transport);
      await transport.handleRequest(req as any, res as any, req.body);
      return; // Request already handled
    } else {
      // Invalid request - no session ID or not initialization request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided for non-initialization request'
        },
        id: null
      });
      return;
    }

    // Handle the request with existing transport
    await transport.handleRequest(req as any, res as any, req.body);
  } catch (error) {
    console.error('Error handling MCP request:', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error'
        },
        id: null
      });
    }
  }
};

/**
 * Handles MCP GET requests for Server-Sent Events (SSE) streams
 */
const mcpGetHandler = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  // Check for Last-Event-ID header for resumability
  const lastEventId = req.headers['last-event-id'] as string;
  if (lastEventId) {
    console.log(`Client reconnecting with Last-Event-ID: ${lastEventId}`);
  } else {
    console.log(`Establishing new SSE stream for session ${sessionId}`);
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req as any, res as any);
};

/**
 * Handles MCP DELETE requests for session termination
 */
const mcpDeleteHandler = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  console.log(`Received session termination request for session ${sessionId}`);
  
  try {
    const transport = transports[sessionId];
    await transport.handleRequest(req as any, res as any);
  } catch (error) {
    console.error('Error handling session termination:', error);
    if (!res.headersSent) {
      res.status(500).send('Error processing session termination');
    }
  }
};

// Set up MCP endpoints
app.post('/mcp', mcpPostHandler);
app.get('/mcp', mcpGetHandler);
app.delete('/mcp', mcpDeleteHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'mcp-abap-adt-server',
    transport: 'streamable-http',
    port: MCP_PORT,
    activeSessions: Object.keys(transports).length
  });
});

// Start the HTTP server
app.listen(MCP_PORT, (error?: Error) => {
  if (error) {
    console.error('Failed to start MCP HTTP server:', error);
    process.exit(1);
  }
  console.log(`MCP ABAP ADT HTTP Server listening on port ${MCP_PORT}`);
  console.log(`Health check available at: http://localhost:${MCP_PORT}/health`);
  console.log(`MCP endpoint available at: http://localhost:${MCP_PORT}/mcp`);
});

// Handle server shutdown gracefully
process.on('SIGINT', async () => {
  console.log('Shutting down MCP HTTP server...');
  
  // Close all active transports to properly clean up resources
  for (const sessionId in transports) {
    try {
      console.log(`Closing transport for session ${sessionId}`);
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  
  console.log('MCP HTTP server shutdown complete');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  // Close all active transports
  for (const sessionId in transports) {
    try {
      await transports[sessionId].close();
      delete transports[sessionId];
    } catch (error) {
      console.error(`Error closing transport for session ${sessionId}:`, error);
    }
  }
  
  process.exit(0);
});
