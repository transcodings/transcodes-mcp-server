/**
 * Shared MCP tool utilities: argument parsing, backend proxy (req), and schema fragments.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ProxyConfig } from '../config.ts';
import { request, type RequestInput } from '../client.ts';

/** MCP tool definition with handler */
export interface ProxyTool extends Tool {
  handler: (
    args: Record<string, unknown>,
    config: ProxyConfig,
  ) => Promise<string>;
}

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** Extracts project_id and optional fields from callTool arguments. */
export const parse = {
  /** Normalises MCP arguments to a plain record (guards against arrays and null). */
  record(v: unknown): Record<string, unknown> {
    if (isPlainRecord(v)) return v;
    return {};
  },

  /** Returns project_id from arguments, falling back to TRANSCODES_PROJECT_ID env. */
  projectId(a: Record<string, unknown>, config: ProxyConfig): string {
    const p = a.project_id ?? config.defaultProjectId;
    if (typeof p !== 'string' || !p.trim()) {
      throw new Error(
        'project_id is required in arguments or set TRANSCODES_PROJECT_ID',
      );
    }
    return p.trim();
  },

  /** Optional numeric query param (e.g. page, limit). */
  num(a: Record<string, unknown>, key: string): number | undefined {
    const v = a[key];
    if (v === undefined || v === null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  },

  /** Optional string query param. */
  str(a: Record<string, unknown>, key: string): string | undefined {
    const v = a[key];
    return typeof v === 'string' ? v : undefined;
  },
};

/** Returns a rejected response for actions that must be performed on the site or console. */
export function blocked(message: string): Promise<string> {
  return Promise.resolve(
    JSON.stringify({ ok: false, blocked: true, message }, null, 2),
  );
}

function blockedJson(message: string): string {
  return JSON.stringify({ ok: false, blocked: true, message }, null, 2);
}

/** Error codes that indicate a plan limit has been reached. */
const PLAN_LIMIT_ERROR_CODES = new Set([
  'ROLE_LIMIT_REACHED',
  'RESOURCE_LIMIT_REACHED',
  'MEMBER_LIMIT_REACHED',
  'PROJECT_LIMIT_REACHED',
]);

const UPGRADE_HINT =
  'Would you like to upgrade your plan? Use the membership_create_checkout_session tool to instantly generate a Stripe Checkout link for the Standard plan.';

/**
 * Resolves the final URL from TRANSCODES_BACKEND_ENDPOINTS + optional pathSuffix and makes the request.
 * Appends an upgradeHint field when the response is a 403 plan-limit error.
 */
export async function req(
  config: ProxyConfig,
  input: Omit<RequestInput, 'path'>,
  toolName: string,
  pathSuffix?: string,
): Promise<string> {
  const map = config.endpointMap;
  if (!map) {
    return blockedJson(
      'TRANSCODES_BACKEND_ENDPOINTS is required. Set it to enable API tools',
    );
  }
  if (!map.has(toolName)) {
    return blockedJson(
      `Tool '${toolName}' is not enabled. Add it to TRANSCODES_BACKEND_ENDPOINTS.`,
    );
  }
  const base = map.get(toolName)!;
  const path = pathSuffix ? `${base}${pathSuffix}` : base;
  const raw = await request(config, { ...input, path });

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      const p = parsed as Record<string, unknown>;
      const data = p.data;
      if (
        p.status === 403 &&
        data !== null &&
        typeof data === 'object' &&
        !Array.isArray(data)
      ) {
        const errorCode = (data as Record<string, unknown>).errorCode;
        if (typeof errorCode === 'string' && PLAN_LIMIT_ERROR_CODES.has(errorCode)) {
          return JSON.stringify({ ...p, upgradeHint: UPGRADE_HINT }, null, 2);
        }
      }
    }
  } catch {
    // Returns the raw response if JSON parsing fails.
  }

  return raw;
}

/**
 * Fetches the project's domain_url and appends ?tc_mode=console.
 * Returns null if the request fails or domain_url is missing.
 */
export async function getConsoleUrl(
  config: ProxyConfig,
  projectId: string,
): Promise<string | null> {
  try {
    const raw = await req(config, { method: 'GET' }, 'get_project', `/${projectId}`);
    const parsed: unknown = JSON.parse(raw);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const data = (parsed as Record<string, unknown>).data;
      if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
        const payload = (data as Record<string, unknown>).payload;
        if (Array.isArray(payload) && payload.length > 0) {
          const project = payload[0] as Record<string, unknown>;
          const domainUrl = project.domain_url;
          if (typeof domainUrl === 'string' && domainUrl.trim()) {
            return `${domainUrl.replace(/\/$/, '')}?tc_mode=console`;
          }
        }
      }
    }
  } catch {
    // Returns null on request or parse failure.
  }
  return null;
}

/** Returns a blocked response string that includes the console_url when available. */
export function blockedWithConsole(url: string | null): string {
  const message =
    'This action must be performed by the user on your site. ' +
    'Visit the console URL below, log in, and manage your authentication credentials from there.';
  return JSON.stringify(
    url
      ? { ok: false, blocked: true, message, console_url: url }
      : { ok: false, blocked: true, message },
    null,
    2,
  );
}

/** JSON Schema fragment: project_id (shared across tool input schemas). */
export const projectProps = {
  project_id: {
    type: 'string',
    description:
      'Transcodes project public id. Falls back to TRANSCODES_PROJECT_ID env when omitted',
  },
};

/** JSON Schema for tools that only accept a Nest DTO body (POST/PUT, etc.). */
export const bodyOnlyInputSchema: Tool['inputSchema'] = {
  type: 'object',
  properties: {
    body: {
      type: 'object',
      description:
        'Request body matching Nest Swagger ApiBody (Create*/Update* DTO field names)',
      additionalProperties: true,
    },
  },
  required: ['body'],
};
