import type { ProxyTool } from './tool-utils.ts';
import { blocked, bodyOnlyInputSchema } from './tool-utils.ts';

const MSG_PROJECT_PWA_AUTH_CONSOLE =
  'PWA and authentication configuration (manifest, service worker, widget, branding, WebAuthn, related origins, token expiry, etc.) must be performed in the Transcodes console. ' +
  'Changes to these settings require the project SDK to be rebuilt and redeployed — a process that the console handles automatically. ' +
  'Modifying them directly via API without going through the console build pipeline will leave the deployed SDK out of sync with your configuration. ' +
  'This MCP tool does not call the API.';

/**
 * `/v1/project/...` 중 PWA·인증 직접 설정은 콘솔 전용 — API 프록시 없이 안내만 반환.
 * 나머지 프로젝트 조회·생성 등은 `transcodes_http_request` 또는 추후 전용 도구.
 */
export const projectTools: ProxyTool[] = [
  {
    name: 'project_pwa_auth_console',
    description:
      'Blocked: PWA and authentication configuration (manifest, service worker, branding, WebAuthn, related origins, token expiry, etc.) must be done in the Transcodes console. ' +
      'These settings trigger an SDK rebuild and redeployment — a pipeline the console manages automatically. ' +
      'Applying changes directly via API skips that pipeline and leaves the live SDK out of sync with the new configuration.',
    inputSchema: bodyOnlyInputSchema,
    handler: async () => blocked(MSG_PROJECT_PWA_AUTH_CONSOLE),
  },
];
