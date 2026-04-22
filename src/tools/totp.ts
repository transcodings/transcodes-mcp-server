import type { ProxyTool } from './tool-utils.ts';
import {
  blockedWithConsoleFromProject,
  parse,
  req,
} from './tool-utils.ts';

/** TOTP MFA */
export const totpTools: ProxyTool[] = [
  {
    name: 'list_totps',
    description:
      'List TOTP devices for a member. Use to audit MFA enrollment. Requires member_id.',
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
        'list_totps'
      ),
  },
  {
    name: 'totp_create',
    description:
      'Blocked: TOTP secret creation must be performed by the user on your website. ' +
      'Returns the project domain URL (?tc_mode=console) for the user to visit, log in, and enroll a TOTP device.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async (_a, config) =>
      blockedWithConsoleFromProject(config, config.projectId),
  },
  {
    name: 'totp_update',
    description:
      'Blocked: TOTP metadata update must be performed by the user on your website. ' +
      'Returns the project domain URL (?tc_mode=console) for the user to visit, log in, and update TOTP device metadata.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async (_a, config) =>
      blockedWithConsoleFromProject(config, config.projectId),
  },
  {
    name: 'totp_revoke',
    description:
      'Blocked: TOTP revocation must be performed by the user on your website. ' +
      'Returns the project domain URL (?tc_mode=console) for the user to visit, log in, and revoke a TOTP device.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async (_a, config) =>
      blockedWithConsoleFromProject(config, config.projectId),
  },
];
