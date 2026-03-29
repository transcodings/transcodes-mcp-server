import type { ProxyTool } from './tool-utils.ts';
import {
  blocked,
  bodyOnlyInputSchema,
  parse,
  projectProps,
  req,
} from './tool-utils.ts';

const MSG_DELETE_MEMBER_CONSOLE =
  'Member deletion must be done in the Transcodes console. This MCP tool does not call the API.';

/** Members — maps to AuthController member routes */
export const membersTools: ProxyTool[] = [
  {
    name: 'get_member',
    description:
      'Get one member profile. Provide `member_id` or `email`. Use for support lookups and auth debugging.',
    inputSchema: {
      type: 'object',
      properties: {
        ...projectProps,
        member_id: { type: 'string' },
        email: { type: 'string' },
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
            email: parse.str(a, 'email'),
          },
        },
        'get_member',
      ),
  },
  {
    name: 'list_members_paginated',
    description:
      'Paginated member list without search. Fast for large directories; use sort_by/order.',
    inputSchema: {
      type: 'object',
      properties: {
        ...projectProps,
        page: { type: 'number' },
        limit: { type: 'number' },
        sort_by: { type: 'string', enum: ['created_at', 'updated_at'] },
        order: { type: 'string', enum: ['asc', 'desc'] },
      },
    },
    handler: async (a, config) =>
      req(
        config,
        {
          method: 'GET',
          query: {
            project_id: parse.projectId(a, config),
            page: parse.num(a, 'page'),
            limit: parse.num(a, 'limit'),
            sort_by: parse.str(a, 'sort_by'),
            order: parse.str(a, 'order'),
          },
        },
        'list_members_paginated',
      ),
  },
  {
    name: 'list_member_devices',
    description:
      'Summary of passkeys, authenticators, and TOTP devices for a member. Labels and last-used timestamps. Use to audit MFA surface.',
    inputSchema: {
      type: 'object',
      properties: {
        ...projectProps,
        member_id: { type: 'string' },
      },
      required: ['member_id'],
    },
    handler: async (a, config) =>
      req(
        config,
        {
          method: 'GET',
          query: {
            project_id: parse.projectId(a, config),
            member_id: String(a.member_id),
          },
        },
        'list_member_devices',
      ),
  },
  {
    name: 'create_member',
    description:
      'Create a member (CreateMemberDto). member_id/name may be auto-generated. Use for onboarding or manual provisioning.',
    inputSchema: bodyOnlyInputSchema,
    handler: async (a, config) =>
      req(config, { method: 'POST', body: a.body }, 'create_member'),
  },
  {
    name: 'update_member',
    description: 'Replace member fields (UpdateMemberDto). Full-document update.',
    inputSchema: bodyOnlyInputSchema,
    handler: async (a, config) =>
      req(config, { method: 'PUT', body: a.body }, 'update_member'),
  },
  {
    name: 'delete_member',
    description:
      'Blocked: member deletion must be done in the Transcodes console only.',
    inputSchema: bodyOnlyInputSchema,
    handler: async () => blocked(MSG_DELETE_MEMBER_CONSOLE),
  },
];
