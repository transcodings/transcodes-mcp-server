import type { ProxyTool } from './tool-utils.ts';
import {
  blockedWithConsoleFromProject,
  parse,
  projectProps,
  req,
} from './tool-utils.ts';

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
        'get_authenticator'
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
        'list_authenticators'
      ),
  },
  {
    name: 'authenticators_register',
    description:
      'Blocked: WebAuthn registration must be completed by the user on your website (browser). ' +
      'Returns the project domain URL (?tc_mode=console) for the user to visit, log in, and register an authenticator.',
    inputSchema: {
      type: 'object',
      properties: { ...projectProps },
    },
    handler: async (a, config) =>
      blockedWithConsoleFromProject(config, parse.projectId(a, config)),
  },
  {
    name: 'authenticators_update',
    description:
      'Blocked: authenticator metadata update must be performed by the user on your website. ' +
      'Returns the project domain URL (?tc_mode=console) for the user to visit, log in, and update credential metadata.',
    inputSchema: {
      type: 'object',
      properties: { ...projectProps },
    },
    handler: async (a, config) =>
      blockedWithConsoleFromProject(config, parse.projectId(a, config)),
  },
  {
    name: 'authenticators_revoke',
    description:
      'Blocked: authenticator revocation must be performed by the user on your website. ' +
      'Returns the project domain URL (?tc_mode=console) for the user to visit, log in, and revoke an authenticator.',
    inputSchema: {
      type: 'object',
      properties: { ...projectProps },
    },
    handler: async (a, config) =>
      blockedWithConsoleFromProject(config, parse.projectId(a, config)),
  },
];
