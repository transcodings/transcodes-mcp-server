import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import type { ProxyConfig } from './config.ts';
import { dispatchTool, getMcpTools } from './tools/index.ts';

export const VERSION = '0.1.0';

/** stdout is reserved for MCP stdio transport — log debug output to stderr */
export function log(...args: unknown[]): void {
  process.stderr.write(`[transcodes-mcp-server] ${args.join(' ')}\n`);
}

/** Creates an MCP server and registers tool handlers. */
export function createMcpServer(config: ProxyConfig): McpServer {
  const mcp = new McpServer(
    { name: 'transcodes-mcp-server', version: VERSION },
    { capabilities: { tools: {} } },
  );

  mcp.server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: getMcpTools(config),
  }));

  mcp.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = request.params.arguments ?? {};
    log(`call ${toolName}`);

    try {
      const text = await dispatchTool(toolName, args, config);
      return { content: [{ type: 'text', text }] };
    } catch (err) {
      if (err instanceof McpError) throw err;

      const message = err instanceof Error ? err.message : String(err);
      log(`error ${toolName}: ${message}`);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ ok: false, status: 0, error: message }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  return mcp;
}
