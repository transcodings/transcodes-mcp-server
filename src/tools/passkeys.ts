import type { ProxyTool } from './tool-utils.ts';
import {
  blocked,
  bodyOnlyInputSchema,
  parse,
  projectProps,
  req,
} from './tool-utils.ts';

const MSG_PASSKEY_REGISTER_SITE =
  'Passkey registration must be completed by the user in the browser on your site. This MCP tool does not call the API.';
const MSG_PASSKEY_DELETE_CONSOLE =
  'Passkey removal must be done in the Transcodes console. This MCP tool does not call the API.';

/** Passkeys */
export const passkeysTools: ProxyTool[] = [
  {
    name: 'list_passkeys',
    description:
      'List passkeys for a member. Server typically filters by project rp_id.',
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
        'list_passkeys',
      ),
  },
  {
    name: 'passkeys_registration_options',
    description:
      'Passkey registration options/challenge. Different service from generic authenticators.',
    inputSchema: bodyOnlyInputSchema,
    handler: async (a, config) =>
      req(config, { method: 'POST', body: a.body }, 'passkeys_registration_options'),
  },
  {
    name: 'passkeys_register',
    description:
      'Blocked: passkey registration must be completed by the user on your website (browser WebAuthn).',
    inputSchema: bodyOnlyInputSchema,
    handler: async () => blocked(MSG_PASSKEY_REGISTER_SITE),
  },
  {
    name: 'passkeys_update',
    description: 'Update passkey metadata such as label.',
    inputSchema: bodyOnlyInputSchema,
    handler: async (a, config) =>
      req(config, { method: 'PUT', body: a.body }, 'passkeys_update'),
  },
  {
    name: 'passkeys_delete',
    description:
      'Blocked: passkey deletion must be done in the Transcodes console only.',
    inputSchema: bodyOnlyInputSchema,
    handler: async () => blocked(MSG_PASSKEY_DELETE_CONSOLE),
  },
];
