import type { ProxyTool } from './tool-utils.ts';
import {
  blocked,
  bodyOnlyInputSchema,
  parse,
  projectProps,
  req,
} from './tool-utils.ts';

const MSG_AUTH_REGISTER_SITE =
  'Authenticator registration must be completed by the user in the browser on your site. This MCP tool does not call the API.';
const MSG_AUTH_DELETE_CONSOLE =
  'Authenticator removal must be done in the Transcodes console. This MCP tool does not call the API.';

/** WebAuthn authenticators (non-passkey flow) */
export const authenticatorsTools: ProxyTool[] = [
  {
    name: 'get_authenticator',
    description:
      'Get one WebAuthn authenticator by credential id. Requires project_id, member_id, id.',
    inputSchema: {
      type: 'object',
      properties: {
        ...projectProps,
        member_id: { type: 'string' },
        id: { type: 'string', description: 'credential id' },
      },
    },
    handler: async (a, config) =>
      req(
        config,
        {
          method: 'GET',
          query: {
            project_id: parse.projectId(a, config),
            member_id: parse.str(a, 'member_id'),
            id: parse.str(a, 'id'),
          },
        },
        'get_authenticator',
      ),
  },
  {
    name: 'list_authenticators',
    description:
      'List all WebAuthn authenticators for a member. Separate from the passkey service.',
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
        'list_authenticators',
      ),
  },
  {
    name: 'authenticators_register',
    description:
      'Blocked: WebAuthn registration must be completed by the user on your website (browser).',
    inputSchema: bodyOnlyInputSchema,
    handler: async () => blocked(MSG_AUTH_REGISTER_SITE),
  },
  {
    name: 'authenticators_update',
    description: 'Update credential metadata such as label.',
    inputSchema: bodyOnlyInputSchema,
    handler: async (a, config) =>
      req(
        config,
        { method: 'PUT', body: a.body },
        'authenticators_update',
      ),
  },
  {
    name: 'authenticators_delete',
    description:
      'Blocked: authenticator deletion must be done in the Transcodes console only.',
    inputSchema: bodyOnlyInputSchema,
    handler: async () => blocked(MSG_AUTH_DELETE_CONSOLE),
  },
];
