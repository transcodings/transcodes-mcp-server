import type { ProxyTool } from './tool-utils.ts';
import {
  blocked,
  bodyOnlyInputSchema,
  parse,
  projectProps,
  req,
} from './tool-utils.ts';

const MSG_TOTP_CONSOLE =
  'TOTP enrollment and removal must be done in the Transcodes console. This MCP tool does not call the API.';

/** TOTP MFA */
export const totpTools: ProxyTool[] = [
  {
    name: 'list_totps',
    description: 'List TOTP devices for a member. Use to audit MFA enrollment.',
    inputSchema: {
      type: 'object',
      properties: { ...projectProps, member_id: { type: 'string' } },
    },
    handler: async (a, config) =>
      req(
        config,
        {
          method: 'GET',
          query: {
            project_id: parse.projectId(a, config),
            member_id: parse.str(a, 'member_id'),
          },
        },
        'list_totps',
      ),
  },
  {
    name: 'totp_create',
    description:
      'Blocked: TOTP secret creation must be done in the Transcodes console only.',
    inputSchema: bodyOnlyInputSchema,
    handler: async () => blocked(MSG_TOTP_CONSOLE),
  },
  {
    name: 'totp_update',
    description: 'Update TOTP metadata such as label or status.',
    inputSchema: bodyOnlyInputSchema,
    handler: async (a, config) =>
      req(config, { method: 'PUT', body: a.body }, 'totp_update'),
  },
  {
    name: 'totp_delete',
    description:
      'Blocked: TOTP removal must be done in the Transcodes console only.',
    inputSchema: bodyOnlyInputSchema,
    handler: async () => blocked(MSG_TOTP_CONSOLE),
  },
];
