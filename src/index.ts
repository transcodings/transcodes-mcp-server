#!/usr/bin/env node
import 'dotenv/config';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.ts';
import { createMcpServer, log, VERSION } from './server.ts';
import { startTunnel } from './tunnel.ts';
import { startSseServer } from './sse.ts';

const DEFAULT_PORT = 3000;

async function main(): Promise<void> {
  const config = loadConfig();
  const port = parseInt(process.env.MCP_PORT ?? String(DEFAULT_PORT), 10);

  log(`starting v${VERSION} → ${config.backendUrl}`);

  // If NGROK_AUTHTOKEN or ZROK_TOKEN is set: SSE + tunnel; otherwise: stdio
  const tunnel = await startTunnel(port);

  if (tunnel) {
    // Streamable HTTP (Bolt.new, Lovable 등 웹 IDE) — 엔드포인트 `/mcp`
    const server = await startSseServer(port, config);
    log(`HTTP listening on http://localhost:${port}`);
    log(`${tunnel.provider} tunnel → ${tunnel.publicUrl}`);

    process.stderr.write(
      '\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '🚀 Transcodes MCP is ready!\n' +
      '   Paste this URL into your web IDE MCP settings:\n' +
      '\n' +
      `   ${tunnel.publicUrl}/mcp\n` +
      '\n' +
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
      '\n',
    );

    const shutdown = async () => {
      log('shutting down…');
      await tunnel.close();
      server.close();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } else {
    // stdio mode (Cursor, Claude Desktop)
    const mcp = createMcpServer(config);
    const transport = new StdioServerTransport();
    await mcp.connect(transport);
    log('ready');

    const shutdown = async () => {
      log('shutting down…');
      await mcp.close();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }
}

main().catch((err) => {
  process.stderr.write(`[transcodes-mcp-server] fatal: ${err}\n`);
  process.exit(1);
});
