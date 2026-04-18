import type { ProxyTool } from './tool-utils.ts';
import { parse, req, requireStepup } from './tool-utils.ts';

// revoke_member: DELETE /v1/auth/member, body: { project_id, member_id }. Call after step-up.

/**
 * AuthController member revocation — the path MUST use the singular **member** segment.
 * Wrong examples: /auth/members/revocation, /members/revocation, /member/suspend, PUT/PATCH.
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
            project_id: config.projectId,
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
            project_id: config.projectId,
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
            project_id: config.projectId,
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
      'Auth: TRANSCODES_TOKEN sent as X-API-Key (not in body).',
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description:
            'CreateMemberDto fields (project_id is set from TRANSCODES_TOKEN by the server, not passed here).',
          properties: {
            email: { type: 'string', description: 'Member email address' },
            name: { type: 'string', description: 'Display name (optional, max 100 chars)' },
            role: { type: 'string', description: 'Role name to assign (optional, max 50 chars)' },
            metadata: { type: 'object', description: 'Arbitrary key-value metadata (optional)', additionalProperties: true },
          },
          required: ['email'],
        },
      },
      required: ['body'],
    },
    handler: async (a, config) =>
      req(
        config,
        {
          method: 'POST',
          body: { ...parse.record(a.body), project_id: config.projectId },
        },
        'create_member',
      ),
  },
  {
    name: 'update_member',
    description:
      'Replace member fields (UpdateMemberDto). Full-document update. ' +
      'Auth: TRANSCODES_TOKEN sent as X-API-Key (not in body).',
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description:
            'UpdateMemberDto (project_id is set from TRANSCODES_TOKEN by the server, not passed here).',
          properties: {
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
          required: ['member_id', 'body'],
        },
      },
      required: ['body'],
    },
    handler: async (a, config) =>
      req(
        config,
        {
          method: 'PUT',
          body: { ...parse.record(a.body), project_id: config.projectId },
        },
        'update_member',
      ),
  },
  {
    name: 'revoke_member',
    description:
      'Revoke a member\'s access and clean up their project enrollment. ' +
      'Use when the user wants to remove, drop, or dismiss a member. ' +
      'Verified action — requires step-up MFA. Body: { member_id } — project_id comes from TRANSCODES_TOKEN.',
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description: 'project_id is set from TRANSCODES_TOKEN by the server.',
          properties: {
            member_id: { type: 'string', description: 'Member public id to revoke' },
          },
          required: ['member_id'],
        },
      },
      required: ['body'],
    },
    handler: async (a, config) => {
      const blocked = requireStepup(config);
      if (blocked) return blocked;
      const result = await req(
        config,
        {
          method: 'DELETE',
          body: { ...parse.record(a.body), project_id: config.projectId },
        },
        'revoke_member',
      );
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
            project_id: config.projectId,
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
      'Body: { member_id } — project_id comes from TRANSCODES_TOKEN. POST only. ' +
      MEMBER_REVOCATION_API_NOTE,
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description: 'project_id is set from TRANSCODES_TOKEN by the server.',
          properties: {
            member_id: { type: 'string', description: 'Member public id to suspend' },
          },
          required: ['member_id'],
        },
      },
      required: ['body'],
    },
    handler: async (a, config) => {
      const blocked = requireStepup(config);
      if (blocked) return blocked;
      const result = await req(
        config,
        {
          method: 'POST',
          body: { ...parse.record(a.body), project_id: config.projectId },
        },
        'create_member_revocation',
      );
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
      'Body: { member_id } — project_id comes from TRANSCODES_TOKEN. ' +
      MEMBER_REVOCATION_API_NOTE,
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description: 'project_id is set from TRANSCODES_TOKEN by the server.',
          properties: {
            member_id: { type: 'string', description: 'Member public id to unsuspend' },
          },
          required: ['member_id'],
        },
      },
      required: ['body'],
    },
    handler: async (a, config) => {
      const blocked = requireStepup(config);
      if (blocked) return blocked;
      const result = await req(
        config,
        {
          method: 'DELETE',
          body: { ...parse.record(a.body), project_id: config.projectId },
        },
        'lift_member_revocation',
      );
      config.verifiedStepup = undefined;
      return result;
    },
  },
];
