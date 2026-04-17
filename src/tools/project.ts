import type { ProxyTool } from './tool-utils.ts';
import { blocked, req } from './tool-utils.ts';

const MSG_PROJECT_PWA_AUTH_CONSOLE =
  'PWA and authentication configuration (manifest, service worker, widget, branding, WebAuthn, related origins, token expiry, etc.) must be performed in the Transcodes console. ' +
  'Changes to these settings require the project SDK to be rebuilt and redeployed — a process that the console handles automatically. ' +
  'Modifying them directly via API without going through the console build pipeline will leave the deployed SDK out of sync with your configuration. ' +
  'This MCP tool does not call the API.';

/**
 * `/v1/project/...`
 * - get_project: GET /project/:project_id — 단건 조회
 * - get_projects: GET /project/organization/:organization_id — 조직의 프로젝트 목록
 * - PWA·인증 설정 변경은 콘솔 전용 (project_pwa_auth_console)
 */
export const projectTools: ProxyTool[] = [
  {
    name: 'get_project',
    description:
      'Fetch a single project by its ID. ' +
      'Returns all information about the project — including toolkit, pwa, domain_url, title, description, and created/updated timestamps. ' +
      'Use this to retrieve the complete project details in one call. ' +
      'Requires project_id.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Root project public ID to look up.',
        },
      },
      required: ['project_id'],
    },
    handler: async (a, config) =>
      req(config, { method: 'GET' }, 'get_project', `/${String(a.project_id)}`),
  },

  {
    name: 'project_pwa_auth_console',
    description:
      'Blocked: PWA and authentication configuration (manifest, service worker, branding, WebAuthn, related origins, token expiry, etc.) must be done in the Transcodes console. ' +
      'These settings trigger an SDK rebuild and redeployment — a pipeline the console manages automatically. ' +
      'Applying changes directly via API skips that pipeline and leaves the live SDK out of sync with the new configuration.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => blocked(MSG_PROJECT_PWA_AUTH_CONSOLE),
  },
];
