/**
 * On-demand HTTP MCP server (Streamable HTTP transport).
 * Started/stopped via MCP tools. Provides a local /mcp endpoint
 * that web IDEs or external tunnels can connect to.
 */
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import type { ProxyConfig } from './config.ts';
import { createMcpServer, log } from './server.ts';

let httpServer: http.Server | null = null;
let activePort = 0;

/** 요청 본문 최대 크기 (1 MB) */
const MAX_BODY_BYTES = 1_048_576;

function setCors(res: http.ServerResponse, origin: string): void {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, mcp-session-id, last-event-id',
  );
  res.setHeader('Access-Control-Expose-Headers', 'mcp-session-id');
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const buf = Buffer.from(chunk);
    totalBytes += buf.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new Error('Request body too large');
    }
    chunks.push(buf);
  }
  if (chunks.length === 0) return undefined;
  const text = Buffer.concat(chunks).toString('utf8');
  return text.trim() ? JSON.parse(text) : undefined;
}

export async function startHttpServer(port: number, config: ProxyConfig): Promise<number> {
  if (httpServer) return activePort;

  const { StreamableHTTPServerTransport } = await import(
    '@modelcontextprotocol/sdk/server/streamableHttp.js'
  );
  const { isInitializeRequest } = await import('@modelcontextprotocol/sdk/types.js');

  const transports = new Map<string, InstanceType<typeof StreamableHTTPServerTransport>>();

  /**
   * CORS origin: TRANSCODES_CORS_ORIGIN 환경변수 우선, 없으면 localhost 기본값.
   * port=0(OS 자동 할당)이면 요청의 Origin 헤더가 localhost일 때만 반영.
   */
  const envOrigin = process.env.TRANSCODES_CORS_ORIGIN?.trim();
  const fixedOrigin = port !== 0 ? `http://localhost:${port}` : null;

  function resolveOrigin(req: http.IncomingMessage): string {
    if (envOrigin) return envOrigin;
    if (fixedOrigin) return fixedOrigin;
    const reqOrigin = req.headers.origin ?? '';
    try {
      const parsed = new URL(reqOrigin);
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return reqOrigin;
      }
    } catch { /* invalid origin → 기본값 사용 */ }
    return 'http://localhost';
  }

  httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${port}`);
    setCors(res, resolveOrigin(req));

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, sessions: transports.size }));
      return;
    }

    if (url.pathname !== '/mcp') { res.writeHead(404); res.end('Not found'); return; }

    const sid = req.headers['mcp-session-id'] as string | undefined;

    try {
      if (req.method === 'POST') {
        const body = await readBody(req);

        if (sid && transports.has(sid)) {
          await transports.get(sid)!.handleRequest(req, res, body);
          return;
        }

        if (!sid && isInitializeRequest(body)) {
          let transport: InstanceType<typeof StreamableHTTPServerTransport>;
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (id: string) => { transports.set(id, transport); },
          });
          transport.onclose = () => {
            const id = transport.sessionId;
            if (id) transports.delete(id);
          };
          const mcp = createMcpServer(config);
          await mcp.connect(transport);
          await transport.handleRequest(req, res, body);
          return;
        }

        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Invalid session or not an initialize request' },
          id: null,
        }));
        return;
      }

      if (req.method === 'GET' || req.method === 'DELETE') {
        if (!sid || !transports.has(sid)) {
          res.writeHead(400); res.end('Invalid or missing mcp-session-id'); return;
        }
        await transports.get(sid)!.handleRequest(req, res);
        return;
      }

      res.writeHead(405); res.end('Method Not Allowed');
    } catch (err) {
      log(`HTTP error: ${err instanceof Error ? err.message : String(err)}`);
      if (!res.headersSent) {
        const isTooLarge =
          err instanceof Error && err.message === 'Request body too large';
        res.writeHead(isTooLarge ? 413 : 500, {
          'Content-Type': 'application/json',
        });
        res.end(JSON.stringify({
          jsonrpc: '2.0',
          error: {
            code: isTooLarge ? -32000 : -32603,
            message: isTooLarge ? 'Request body too large' : 'Internal server error',
          },
          id: null,
        }));
      }
    }
  });

  await new Promise<void>((resolve, reject) => {
    httpServer!.listen(port, resolve);
    httpServer!.on('error', reject);
  });

  activePort = (httpServer!.address() as { port: number }).port;
  log(`HTTP MCP listening on http://localhost:${port}/mcp`);
  return port;
}

export function stopHttpServer(): void {
  if (!httpServer) return;
  httpServer.close();
  httpServer = null;
  activePort = 0;
  log('HTTP MCP server stopped');
}

export function getHttpServerStatus(): { running: boolean; port: number; url: string } | { running: boolean } {
  if (!httpServer) return { running: false };
  return { running: true, port: activePort, url: `http://localhost:${activePort}/mcp` };
}
