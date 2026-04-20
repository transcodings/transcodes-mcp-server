/**
 * Configuration loader.
 * Reads values from environment variables set in the MCP client config
 * (Cursor / Claude Desktop mcp.json → `env` block).
 *
 * End users only need to set `TRANSCODES_TOKEN`. `TRANSCODES_BACKEND_URL` and
 * `TRANSCODES_BACKEND_ENDPOINTS` are SDK internals that fall back to the values
 * defined in `src/constants.ts`; set them only when overriding (e.g. pointing
 * at localhost in dev).
 *
 * CI WARNING — 빌드 시점에 이 파일의 `process.env.TRANSCODES_*` 참조를
 * 리터럴 값으로 치환하지 말 것. 치환하면 runtime env override 가 무력화됨.
 * 회귀 방지 가드: `scripts/verify-dist.js` (positive check — process.env
 * references must survive in the compiled dist).
 * 배경: THT-260.
 */
import {
  DEFAULT_BACKEND_URL,
  DEFAULT_ENDPOINT_MAP_JSON,
} from './constants.ts';
import { parseMemberAccessToken } from './token.ts';

/** Verified step-up state (kept in session memory only). */
export type VerifiedStepup = {
  sid: string;
  verifiedAt: number;
};

/** Step-up validity window (ms) — must match the backend TTL. */
export const STEPUP_TTL_MS = 10 * 60 * 1_000;

export type ProxyConfig = {
  backendUrl: string;
  apiBaseV1: string;
  /** Member MCP JWT (TRANSCODES_TOKEN). Sent on every request as `x-transcodes-token`. */
  token: string;
  /** JWT organizationId claim */
  organizationId: string;
  /** JWT projectId claim — fixed at issue time and not overridden at runtime. */
  projectId: string;
  /** JWT memberId claim — default member for step-up and get_my_profile. */
  memberId: string;
  /** Set after poll_stepup_session reports verified. */
  verifiedStepup?: VerifiedStepup;
  /** Tool name → path after `/v1`. Defaults to DEFAULT_ENDPOINT_MAP_JSON; env override supported. */
  endpointMap: Map<string, string>;
};

/** TRANSCODES_BACKEND_ENDPOINTS JSON string → Map (values must be string paths). */
function parseEndpointMapJson(raw: string): Map<string, string> {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('must be a JSON object');
  }
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v !== 'string') {
      throw new Error(`value for "${k}" must be a string`);
    }
    map.set(k, v);
  }
  return map;
}

/** Assembles ProxyConfig from process.env (with constants.ts fallback). dotenv is loaded earlier in index.ts. */
export function loadConfig(): ProxyConfig {
  const rawUrl =
    process.env.TRANSCODES_BACKEND_URL?.trim() || DEFAULT_BACKEND_URL;
  const backendUrl = rawUrl.replace(/\/$/, '');

  try {
    new URL(backendUrl);
  } catch {
    throw new Error(`TRANSCODES_BACKEND_URL is not a valid URL: ${backendUrl}`);
  }

  const apiBaseV1 = `${backendUrl}/v1`;

  const tokenRaw = process.env.TRANSCODES_TOKEN?.trim() ?? '';
  if (!tokenRaw) {
    throw new Error('TRANSCODES_TOKEN is required (member MCP JWT)');
  }

  let token: string;
  let organizationId: string;
  let projectId: string;
  let memberId: string;
  try {
    const parsed = parseMemberAccessToken(tokenRaw);
    token = parsed.raw;
    organizationId = parsed.claims.organizationId;
    projectId = parsed.claims.projectId;
    memberId = parsed.claims.memberId;
    for (const w of parsed.warnings) {
      process.stderr.write(
        `[transcodes-mcp-server] WARN TRANSCODES_TOKEN: ${w}\n`
      );
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(`TRANSCODES_TOKEN: ${detail}`);
  }

  const endpointsRaw =
    process.env.TRANSCODES_BACKEND_ENDPOINTS?.trim() ||
    DEFAULT_ENDPOINT_MAP_JSON;
  let endpointMap: Map<string, string>;
  try {
    endpointMap = parseEndpointMapJson(endpointsRaw);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(
      `TRANSCODES_BACKEND_ENDPOINTS must be valid JSON: {"tool":"/path",...} — ${detail}`
    );
  }
  if (endpointMap.size === 0) {
    throw new Error(
      'TRANSCODES_BACKEND_ENDPOINTS must define at least one tool'
    );
  }

  return {
    backendUrl,
    apiBaseV1,
    token,
    organizationId,
    projectId,
    memberId,
    endpointMap,
  };
}
