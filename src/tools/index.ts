/**
 * MCP 도구 등록소: 도메인별 배열을 합치고 list/dispatch만 노출.
 * 실제 URL 경로는 TRANSCODES_BACKEND_ENDPOINTS 맵(tool-utils.req)에서만 결정.
 */
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import type { ProxyConfig } from '../config.ts';
import { parse, type ProxyTool } from './tool-utils.ts';

import { instructionsTools } from './instructions.ts';
import { jwkTools } from './jwk.ts';
import { auditTools } from './audit.ts';
import { authenticatorsTools } from './authenticators.ts';
import { httpTools } from './http.ts';
import { membershipTools } from './membership.ts';
import { membersTools } from './members.ts';
import { otpTools } from './otp.ts';
import { passcodeTools } from './passcode.ts';
import { passkeysTools } from './passkeys.ts';
import { platformTools } from './platform.ts';
import { projectTools } from './project.ts';
import { rbacTools } from './rbac.ts';
import { totpTools } from './totp.ts';

const ALL_TOOLS: ProxyTool[] = [
  ...instructionsTools,
  ...jwkTools,
  ...auditTools,
  ...projectTools,
  ...rbacTools,
  ...membershipTools,
  ...membersTools,
  ...authenticatorsTools,
  ...passkeysTools,
  ...totpTools,
  ...otpTools,
  ...passcodeTools,
  ...platformTools,
  ...httpTools,
];

/** 이름 → ProxyTool (시작 시 한 번만 구축) */
const TOOL_MAP = new Map<string, ProxyTool>(ALL_TOOLS.map((t) => [t.name, t]));

/**
 * 클라이언트에 보여 줄 도구 목록. endpointMap 없으면 빈 배열.
 */
export function getMcpTools(config: ProxyConfig): Tool[] {
  if (!config.endpointMap) return [];
  return ALL_TOOLS
    .filter((t) => config.endpointMap!.has(t.name))
    .map(({ handler: _handler, ...toolDef }) => toolDef);
}

export async function dispatchTool(
  name: string,
  args: unknown,
  config: ProxyConfig,
): Promise<string> {
  if (config.endpointMap && !config.endpointMap.has(name)) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
  const tool = TOOL_MAP.get(name);
  if (!tool) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
  return tool.handler(parse.record(args), config);
}
