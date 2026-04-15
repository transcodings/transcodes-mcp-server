/**
 * Shared MCP tool utilities: argument parsing, backend proxy (req), and schema fragments.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { STEPUP_TTL_MS, type ProxyConfig } from '../config.ts';
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

/**
 * Shared copy for MCP tool descriptions and schemas.
 * Recommended: set TRANSCODES_PROJECT_ID in the client env; otherwise ask the user.
 */
export const PROJECT_ID_GUIDANCE =
  'Recommended: set TRANSCODES_PROJECT_ID in the MCP client env block (e.g. Cursor ~/.cursor/mcp.json or Claude Desktop mcpServers.*.env). ' +
  'If it is not set, ask the user for the Transcodes project public id before calling.';

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
        'project_id is missing. ' +
          PROJECT_ID_GUIDANCE +
          ' You can pass project_id in tool arguments once the user provides it.',
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

/**
 * Returns whether step-up MFA is still valid. If not verified, returns a blocked JSON string; if verified, null.
 * Call before sensitive tool handlers (revoke_member, retire_*, passcode_create, etc.).
 */
export function requireStepup(config: ProxyConfig): string | null {
  const v = config.verifiedStepup;
  if (!v) {
    return JSON.stringify({
      ok: false,
      blocked: true,
      message:
        'Step-up MFA required. Call create_stepup_session first (comment: one short sentence for the step-up UI), ' +
        'send the user the auth URL, then poll_stepup_session after they confirm',
    }, null, 2);
  }
  if (Date.now() - v.verifiedAt > STEPUP_TTL_MS) {
    config.verifiedStepup = undefined;
    return JSON.stringify({
      ok: false,
      blocked: true,
      message:
        'Step-up session has expired. Call create_stepup_session again',
    }, null, 2);
  }
  return null;
}

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
 * Full URL: `${apiBaseV1}${base}${pathSuffix}` (see client.ts — path is after `/v1`).
 *
 * Sensitive tools (call requireStepup in code first) and their endpoint map / final paths:
 * - revoke_member: DELETE map `/auth/member` — no suffix — body `{ project_id, member_id }`
 * - retire_role: DELETE map `/auth/role` — suffix `/:role_id` — body `{ project_id }`
 * - retire_resource: DELETE map `/auth/resources` — suffix `/:resource_key` — query `project_id`, omitBody
 * - passcode_create: POST map `/auth/passcode/create` — body CreatePasscodeDto
 * - create_stepup_session: POST …/step-up/session — body includes comment (one sentence for the UI)
 * - poll_stepup_session: GET same map base — suffix `/:sid`
 *
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
 * Looks up a member public id by email via get_member.
 * Shared by create_stepup_session and similar flows.
 */
export async function resolveMemberIdByEmail(
  config: ProxyConfig,
  projectId: string,
  email: string,
): Promise<{ member_id: string } | { error: string }> {
  const raw = await req(
    config,
    { method: 'GET', query: { project_id: projectId, email } },
    'get_member',
  );
  const parsed: unknown = JSON.parse(raw);
  if (
    parsed === null ||
    typeof parsed !== 'object' ||
    Array.isArray(parsed)
  ) {
    return { error: raw };
  }
  const p = parsed as Record<string, unknown>;
  if (!p.ok) {
    return { error: `get_member failed: ${raw}` };
  }
  const data = p.data as Record<string, unknown> | undefined;
  const payload = data?.payload;
  if (!Array.isArray(payload) || payload.length === 0) {
    return { error: `No member found for email: ${email}` };
  }
  const member = payload[0] as Record<string, unknown>;
  const id = member.id;
  if (typeof id !== 'string' || !id) {
    return { error: 'Member record has no id field' };
  }
  return { member_id: id };
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

/**
 * Browser-only tools (passkeys, authenticators, totp, etc.): resolve `domain_url` via get_project,
 * then return a blockedWithConsole response with `?tc_mode=console` (get_project → domain_url?tc_mode=console).
 */
export async function blockedWithConsoleFromProject(
  config: ProxyConfig,
  projectId: string,
): Promise<string> {
  const url = await getConsoleUrl(config, projectId);
  return blockedWithConsole(url);
}

/** JSON Schema fragment: project_id (shared across tool input schemas). */
export const projectProps = {
  project_id: {
    type: 'string',
    description:
      'Transcodes project public id. ' +
      PROJECT_ID_GUIDANCE +
      ' When TRANSCODES_PROJECT_ID is set in MCP env, this argument may be omitted.',
  },
};

