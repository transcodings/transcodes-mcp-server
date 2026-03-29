import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { request, type RequestInput } from '../client.ts';
import type { ProxyTool } from './tool-utils.ts';
import { parse } from './tool-utils.ts';

/** 전용 도구가 없는 엔드포인트용 escape hatch — 유저가 경로를 직접 제공 */
export const httpTools: ProxyTool[] = [
  {
    name: 'transcodes_http_request',
    description:
      'Generic REST call: method + path **after** `/v1` + optional query + body. Use only when no dedicated tool exists (e.g. organization APIs). Do not use for JWK backup — use the Transcodes console. Prefer domain tools first.',
    inputSchema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        },
        path: {
          type: 'string',
          description: 'e.g. /organizations/... (path after /v1)',
        },
        query: { type: 'object', additionalProperties: true },
        body: {},
      },
      required: ['method', 'path'],
    },
    handler: async (a, config) => {
      if (!config.endpointMap || !config.endpointMap.has('transcodes_http_request')) {
        return JSON.stringify(
          {
            ok: false,
            blocked: true,
            message:
              "Tool 'transcodes_http_request' is not enabled. Add it to TRANSCODES_BACKEND_ENDPOINTS.",
          },
          null,
          2,
        );
      }

      const methodUpper = parse.str(a, 'method')?.toUpperCase();
      const allowed: RequestInput['method'][] = [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
      ];
      const method = allowed.find((m) => m === methodUpper);
      if (!method) {
        throw new McpError(ErrorCode.InvalidParams, 'Invalid method');
      }
      let path = String(a.path ?? '');
      if (!path.startsWith('/')) path = `/${path}`;

      const queryObj = a.query;
      const query: Record<string, string | number | undefined> = {};
      if (queryObj && typeof queryObj === 'object' && !Array.isArray(queryObj)) {
        for (const [k, v] of Object.entries(queryObj)) {
          if (v === undefined || v === null) continue;
          query[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
        }
      }

      return request(config, { method, path, query, body: a.body });
    },
  },
];
