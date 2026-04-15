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
import { organizationTools } from './organization.ts';
import { projectTools } from './project.ts';
import { rbacTools } from './rbac.ts';
import { totpTools } from './totp.ts';
import { proxyTools } from './proxy.ts';
import { stepupTools } from './stepup.ts';

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
  ...organizationTools,
  ...httpTools,
  ...stepupTools,
  ...proxyTools,
];

/** 이름 → ProxyTool (시작 시 한 번만 구축) */
const TOOL_MAP = new Map<string, ProxyTool>(ALL_TOOLS.map((t) => [t.name, t]));

const ALWAYS_VISIBLE = new Set(proxyTools.map((t) => t.name));

export function getMcpTools(config: ProxyConfig): Tool[] {
  return ALL_TOOLS
    .filter((t) => ALWAYS_VISIBLE.has(t.name) || config.endpointMap?.has(t.name))
    .map(({ handler: _handler, ...toolDef }) => toolDef);
}

export async function dispatchTool(
  name: string,
  args: unknown,
  config: ProxyConfig,
): Promise<string> {
  if (!ALWAYS_VISIBLE.has(name) && config.endpointMap && !config.endpointMap.has(name)) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
  const tool = TOOL_MAP.get(name);
  if (!tool) {
    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  }
  return tool.handler(parse.record(args), config);
}
