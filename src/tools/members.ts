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

/**
 * AuthController 멤버 정지(revocation) — 반드시 **member** 단수 경로.
 * 잘못된 예: /auth/members/revocation, /members/revocation, /member/suspend, PUT/PATCH.
 */
const MEMBER_REVOCATION_API_NOTE =
  'Exact path after /v1: /auth/member/revocation (singular member, NOT members). ' +
  'GET=query only; POST=suspend body; DELETE=unsuspend body. No PUT, PATCH, or /member/suspend.';

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
  {
    name: 'get_member_revocation',
    description:
      'Check when a specific member\'s account or session was suspended (locked/blocked). ' +
      'Returns { revoked_at: ISO date string } if the member is currently suspended, or { revoked_at: null } if active. ' +
      'Use this to find out whether a member is suspended and exactly when the suspension was applied. ' +
      MEMBER_REVOCATION_API_NOTE,
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
        'get_member_revocation',
      ),
  },
  {
    name: 'create_member_revocation',
    description:
      'Suspend a specific member\'s account: blocks their login and invalidates all active sessions immediately. ' +
      'Once suspended, the member cannot sign in or use any session tokens until the suspension is lifted. ' +
      'Body: project_id, member_id (DeleteMemberDto). POST only. ' +
      MEMBER_REVOCATION_API_NOTE,
    inputSchema: bodyOnlyInputSchema,
    handler: async (a, config) =>
      req(
        config,
        { method: 'POST', body: a.body },
        'create_member_revocation',
      ),
  },
  {
    name: 'delete_member_revocation',
    description:
      'Lift (unsuspend) a specific member\'s account: removes the suspension lock and restores their ability to log in and create sessions. ' +
      'Use this to re-enable a member that was previously suspended via create_member_revocation. ' +
      'Body: project_id, member_id (DeleteMemberDto). DELETE only. ' +
      MEMBER_REVOCATION_API_NOTE,
    inputSchema: bodyOnlyInputSchema,
    handler: async (a, config) =>
      req(
        config,
        { method: 'DELETE', body: a.body },
        'delete_member_revocation',
      ),
  },
];
