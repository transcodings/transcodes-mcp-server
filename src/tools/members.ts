import type { ProxyTool } from './tool-utils.ts';
import {
  parse,
  projectProps,
  PROJECT_ID_GUIDANCE,
  req,
  requireStepup,
} from './tool-utils.ts';

// revoke_member: DELETE /v1/auth/member, body: { project_id, member_id }. step-up 후 호출.

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
      'Create a member (CreateMemberDto). member_id/name may be auto-generated. Use for onboarding or manual provisioning. ' +
      'Auth: X-API-Key from TRANSCODES_API_KEY (not in body).',
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description: 'Request body matching Nest Swagger ApiBody (CreateMemberDto). ' + PROJECT_ID_GUIDANCE +
            ' Include project_id in the body when TRANSCODES_PROJECT_ID is not set in MCP env.',
          properties: {
            project_id: { type: 'string', description: 'Transcodes project public id' },
            email: { type: 'string', description: 'Member email address' },
            name: { type: 'string', description: 'Display name (optional, max 100 chars)' },
            role: { type: 'string', description: 'Role name to assign (optional, max 50 chars)' },
            metadata: { type: 'object', description: 'Arbitrary key-value metadata (optional)', additionalProperties: true },
          },
          required: ['project_id', 'email'],
        },
      },
      required: ['body'],
    },
    handler: async (a, config) =>
      req(config, { method: 'POST', body: a.body }, 'create_member'),
  },
  {
    name: 'update_member',
    description:
      'Replace member fields (UpdateMemberDto). Full-document update. ' +
      'Auth: X-API-Key from TRANSCODES_API_KEY (not in body).',
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description: 'Request body matching Nest Swagger ApiBody (UpdateMemberDto). ' + PROJECT_ID_GUIDANCE,
          properties: {
            project_id: { type: 'string', description: 'Transcodes project public id' },
            member_id: { type: 'string', description: 'Member public id to update' },
            body: {
              type: 'object',
              description: 'Fields to update (MemberUpdateBody)',
              properties: {
                name: { type: 'string', description: 'Display name (max 100 chars)' },
                email: { type: 'string', description: 'Email address' },
                role: { type: 'string', description: 'Role name (max 50 chars)' },
                metadata: { type: 'object', description: 'Arbitrary key-value metadata', additionalProperties: true },
              },
            },
          },
          required: ['project_id', 'member_id', 'body'],
        },
      },
      required: ['body'],
    },
    handler: async (a, config) =>
      req(config, { method: 'PUT', body: a.body }, 'update_member'),
  },
  {
    name: 'revoke_member',
    description:
      'Revoke a member\'s access and clean up their project enrollment. ' +
      'Use when the user wants to remove, drop, or dismiss a member. ' +
      'Verified action — requires step-up MFA. Body: { project_id, member_id } — both required.',
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description: 'Request body. ' + PROJECT_ID_GUIDANCE,
          properties: {
            project_id: { type: 'string', description: 'Transcodes project public id' },
            member_id: { type: 'string', description: 'Member public id to revoke' },
          },
          required: ['project_id', 'member_id'],
        },
      },
      required: ['body'],
    },
    handler: async (a, config) => {
      const blocked = requireStepup(config);
      if (blocked) return blocked;
      const result = await req(config, { method: 'DELETE', body: a.body }, 'revoke_member');
      config.verifiedStepup = undefined;
      return result;
    },
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
      'Verified action — requires step-up MFA. ' +
      'Body: project_id, member_id. POST only. ' +
      MEMBER_REVOCATION_API_NOTE,
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description: 'Request body. ' + PROJECT_ID_GUIDANCE,
          properties: {
            project_id: { type: 'string', description: 'Transcodes project public id' },
            member_id: { type: 'string', description: 'Member public id to suspend' },
          },
          required: ['project_id', 'member_id'],
        },
      },
      required: ['body'],
    },
    handler: async (a, config) => {
      const blocked = requireStepup(config);
      if (blocked) return blocked;
      const result = await req(config, { method: 'POST', body: a.body }, 'create_member_revocation');
      config.verifiedStepup = undefined;
      return result;
    },
  },
  {
    name: 'lift_member_revocation',
    description:
      'Lift (unsuspend) a specific member\'s account: restores the suspension lock and brings back their ability to log in and create sessions. ' +
      'Use this to re-enable a member that was previously suspended via create_member_revocation. ' +
      'Verified action — requires step-up MFA. ' +
      'Body: project_id, member_id. ' +
      MEMBER_REVOCATION_API_NOTE,
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description: 'Request body. ' + PROJECT_ID_GUIDANCE,
          properties: {
            project_id: { type: 'string', description: 'Transcodes project public id' },
            member_id: { type: 'string', description: 'Member public id to unsuspend' },
          },
          required: ['project_id', 'member_id'],
        },
      },
      required: ['body'],
    },
    handler: async (a, config) => {
      const blocked = requireStepup(config);
      if (blocked) return blocked;
      const result = await req(config, { method: 'DELETE', body: a.body }, 'lift_member_revocation');
      config.verifiedStepup = undefined;
      return result;
    },
  },
];
