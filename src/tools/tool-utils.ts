/**
 * MCP 도구 공통: 인자 파싱, 백엔드 프록시(req), 스키마 조각.
 * 개별 함수를 여러 개 두지 않고 `parse` 한 객체로 묶음.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ProxyConfig } from '../config.ts';
import { request, type RequestInput } from '../client.ts';

/** MCP Tool 정의 + handler */
export interface ProxyTool extends Tool {
  handler: (
    args: Record<string, unknown>,
    config: ProxyConfig,
  ) => Promise<string>;
}

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** callTool 인자에서 project_id·선택 필드만 꺼냄 */
export const parse = {
  /** MCP가 넘긴 arguments를 객체로 (배열·null 방지) */
  record(v: unknown): Record<string, unknown> {
    if (isPlainRecord(v)) return v;
    return {};
  },

  /** 인자의 project_id 또는 TRANSCODES_PROJECT_ID */
  projectId(a: Record<string, unknown>, config: ProxyConfig): string {
    const p = a.project_id ?? config.defaultProjectId;
    if (typeof p !== 'string' || !p.trim()) {
      throw new Error(
        'project_id is required in arguments or set TRANSCODES_PROJECT_ID',
      );
    }
    return p.trim();
  },

  /** 쿼리용 선택 숫자 (page, limit 등) */
  num(a: Record<string, unknown>, key: string): number | undefined {
    const v = a[key];
    if (v === undefined || v === null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  },

  /** 쿼리용 선택 문자열 */
  str(a: Record<string, unknown>, key: string): string | undefined {
    const v = a[key];
    return typeof v === 'string' ? v : undefined;
  },
};

/** 콘솔/사이트에서만 해야 하는 작업 — JSON 문자열로 거절 응답 */
export function blocked(message: string): Promise<string> {
  return Promise.resolve(
    JSON.stringify({ ok: false, blocked: true, message }, null, 2),
  );
}

function blockedJson(message: string): string {
  return JSON.stringify({ ok: false, blocked: true, message }, null, 2);
}

/** 플랜 한도 초과 errorCode 목록 */
const PLAN_LIMIT_ERROR_CODES = new Set([
  'ROLE_LIMIT_REACHED',
  'RESOURCE_LIMIT_REACHED',
  'MEMBER_LIMIT_REACHED',
  'PROJECT_LIMIT_REACHED',
]);

const UPGRADE_HINT =
  'Would you like to upgrade your plan? Use the membership_create_checkout_session tool to instantly generate a Stripe Checkout link for the Standard plan.';

/**
 * TRANSCODES_BACKEND_ENDPOINTS 맵의 base 경로 + pathSuffix로 최종 URL 구성 후 요청.
 * 403 + 플랜 한도 에러 응답이면 upgradeHint 필드를 추가해 반환.
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
    // JSON 파싱 실패 시 원본 그대로 반환
  }

  return raw;
}

/** JSON Schema: project_id (도구 스키마에 공통 삽입) */
export const projectProps = {
  project_id: {
    type: 'string',
    description:
      'Transcodes project public id. Falls back to TRANSCODES_PROJECT_ID env when omitted',
  },
};

/** JSON Schema: Nest DTO body만 받는 POST/PUT 등 */
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
