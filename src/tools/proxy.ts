import type { ProxyTool } from './tool-utils.ts';

export const proxyTools: ProxyTool[] = [
  {
    name: 'start_tunnel',
    description:
      'Starts a local HTTP MCP server (Streamable HTTP) on a random free port and returns http://localhost:<port>/mcp. ' +
      'Use this for clients that speak MCP over HTTP on the same machine; public tunnels are not started here.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async (_args, config) => {
      const port = 0; // 0 = OS assigns a random free port
      try {
        const { startHttpServer } = await import('../http-server.ts');
        const actualPort = await startHttpServer(port, config);
        return JSON.stringify({
          ok: true,
          url: `http://localhost:${actualPort}/mcp`,
        }, null, 2);
      } catch (err) {
        return JSON.stringify(
          { ok: false, error: err instanceof Error ? err.message : String(err) },
          null, 2,
        );
      }
    },
  },
  {
    name: 'stop_tunnel',
    description: 'Stops the local HTTP MCP server if it is running.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const { stopHttpServer, getHttpServerStatus } = await import('../http-server.ts');
      if (!('url' in getHttpServerStatus())) {
        return JSON.stringify({ ok: true, message: 'Not running.' }, null, 2);
      }
      stopHttpServer();
      return JSON.stringify({ ok: true, message: 'Stopped.' }, null, 2);
    },
  },
  {
    name: 'get_tunnel_status',
    description: 'Returns whether the local HTTP MCP server is running and its http://localhost URL if so.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const { getHttpServerStatus } = await import('../http-server.ts');
      return JSON.stringify({ ok: true, ...getHttpServerStatus() }, null, 2);
    },
  },
];
