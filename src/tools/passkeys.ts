import type { ProxyTool } from './tool-utils.ts';
import {
  blockedWithConsoleFromProject,
  parse,
  req,
} from './tool-utils.ts';

/** Passkeys */
export const passkeysTools: ProxyTool[] = [
  {
    name: 'list_passkeys',
    description:
      'List passkeys for a member. Server typically filters by project rp_id. Requires member_id.',
    inputSchema: {
      type: 'object',
      properties: { member_id: { type: 'string' } },
      required: ['member_id'],
    },
    handler: async (a, config) =>
      req(
        config,
        {
          method: 'GET',
          query: {
            project_id: config.projectId,
            member_id: parse.str(a, 'member_id'),
          },
        },
        'list_passkeys'
      ),
  },
  {
    name: 'passkeys_register',
    description:
      'Blocked: passkey registration must be completed by the user on your website (browser WebAuthn). ' +
      'Returns the project domain URL (?tc_mode=console) for the user to visit, log in, and register a passkey.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async (_a, config) =>
      blockedWithConsoleFromProject(config, config.projectId),
  },
  {
    name: 'passkeys_update',
    description:
      'Blocked: passkey metadata update must be performed by the user on your website. ' +
      'Returns the project domain URL (?tc_mode=console) for the user to visit, log in, and update passkey metadata.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async (_a, config) =>
      blockedWithConsoleFromProject(config, config.projectId),
  },
  {
    name: 'passkeys_revoke',
    description:
      'Blocked: passkey revocation must be performed by the user on your website. ' +
      'Returns the project domain URL (?tc_mode=console) for the user to visit, log in, and revoke a passkey.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async (_a, config) =>
      blockedWithConsoleFromProject(config, config.projectId),
  },
];
