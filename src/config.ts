/**
 * Configuration loader.
 * Reads values from environment variables set in the MCP client config
 * (Cursor / Claude Desktop mcp.json → `env` block).
 *
 * 모든 값은 반드시 환경변수로 주입해야 합니다.
 */
/** step-up 인증 완료 상태 (세션 메모리에만 유지) */
export type VerifiedStepup = {
  sid: string;
  verifiedAt: number;
};

/** step-up 유효 기간 (밀리초) — 백엔드 TTL과 동일 */
export const STEPUP_TTL_MS = 10 * 60 * 1_000;

export type ProxyConfig = {
  backendUrl: string;
  apiBaseV1: string;
  apiKey: string;
  defaultProjectId?: string;
  /** TRANSCODES_MEMBER_EMAIL → step-up 인증 시 기본 멤버 식별 */
  memberEmail?: string;
  /** poll_stepup_session verified 시 저장 */
  verifiedStepup?: VerifiedStepup;
  /** TRANSCODES_BACKEND_ENDPOINTS JSON → 도구 이름 → `/v1` 이후 경로 */
  endpointMap?: Map<string, string>;
};

/** TRANSCODES_BACKEND_ENDPOINTS JSON 문자열 → Map (값은 반드시 문자열 경로) */
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

/** process.env에서 ProxyConfig 조립. dotenv는 index.ts에서 선로드 */
export function loadConfig(): ProxyConfig {
  const backendUrl = process.env.TRANSCODES_BACKEND_URL?.trim().replace(
    /\/$/,
    ''
  );
  if (!backendUrl) throw new Error('TRANSCODES_BACKEND_URL is required');

  const apiKey = process.env.TRANSCODES_API_KEY ?? '';
  if (!apiKey) {
    throw new Error(
      'TRANSCODES_API_KEY is required (organization API key from Transcodes console)'
    );
  }

  try {
    new URL(backendUrl);
  } catch {
    throw new Error(`TRANSCODES_BACKEND_URL is not a valid URL: ${backendUrl}`);
  }

  const defaultProjectId =
    process.env.TRANSCODES_PROJECT_ID?.trim() || undefined;
  const apiBaseV1 = `${backendUrl}/v1`;

  const endpointsRaw = process.env.TRANSCODES_BACKEND_ENDPOINTS?.trim();
  let endpointMap: Map<string, string> | undefined;
  if (endpointsRaw) {
    try {
      endpointMap = parseEndpointMapJson(endpointsRaw);
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      throw new Error(
        `TRANSCODES_BACKEND_ENDPOINTS must be valid JSON: {"tool":"/path",...} — ${detail}`
      );
    }
  }

  const memberEmail =
    process.env.TRANSCODES_MEMBER_EMAIL?.trim() || undefined;

  return { backendUrl, apiBaseV1, apiKey, defaultProjectId, memberEmail, endpointMap };
}
