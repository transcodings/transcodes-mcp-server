import type { ProxyTool } from './tool-utils.ts';
import {
  blockedWithConsole,
  getConsoleUrl,
  parse,
  projectProps,
  req,
} from './tool-utils.ts';

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
      properties: { ...projectProps },
    },
    handler: async (a, config) => {
      const url = await getConsoleUrl(config, parse.projectId(a, config));
      return blockedWithConsole(url);
    },
  },
  {
    name: 'passkeys_update',
    description:
      'Blocked: passkey metadata update must be performed by the user on your website. ' +
      'Returns the project domain URL (?tc_mode=console) for the user to visit, log in, and update passkey metadata.',
    inputSchema: {
      type: 'object',
      properties: { ...projectProps },
    },
    handler: async (a, config) => {
      const url = await getConsoleUrl(config, parse.projectId(a, config));
      return blockedWithConsole(url);
    },
  },
  {
    name: 'passkeys_delete',
    description:
      'Blocked: passkey deletion must be performed by the user on your website. ' +
      'Returns the project domain URL (?tc_mode=console) for the user to visit, log in, and delete a passkey.',
    inputSchema: {
      type: 'object',
      properties: { ...projectProps },
    },
    handler: async (a, config) => {
      const url = await getConsoleUrl(config, parse.projectId(a, config));
      return blockedWithConsole(url);
    },
  },
];
