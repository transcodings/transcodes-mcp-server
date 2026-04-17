import type { ProxyTool } from './tool-utils.ts';
import {
  blocked,
  parse,
  projectProps,
  req,
} from './tool-utils.ts';

const MSG_PLATFORM_CONSOLE =
  'User, organization, and API key management must be done in the Transcodes console. This MCP tool does not call the API.';

const MSG_ORG_CONSOLE =
  'Organization settings, user invitations, and invitation management (send, update, cancel, accept, decline) must be done directly in the Transcodes console at https://transcodes.io. This MCP tool does not call the API.';

/**
 * Membership 일부 + User/Org/API Key 도구는 콘솔 전용(차단).
 */
export const organizationTools: ProxyTool[] = [
  {
    name: 'user_get_current',
    description:
      'Blocked: current user profile must be managed in the Transcodes console / host app (Firebase Bearer).',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => blocked(MSG_PLATFORM_CONSOLE),
  },
  {
    name: 'user_find',
    description:
      'Blocked: user lookup must be done in the Transcodes console.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'string', description: 'comma-separated' },
        emails: { type: 'string', description: 'comma-separated' },
      },
    },
    handler: async () => blocked(MSG_PLATFORM_CONSOLE),
  },
  {
    name: 'user_create',
    description: 'Blocked: user creation must be done in the Transcodes console.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => blocked(MSG_PLATFORM_CONSOLE),
  },
  {
    name: 'user_patch',
    description: 'Blocked: user updates must be done in the Transcodes console.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => blocked(MSG_PLATFORM_CONSOLE),
  },
  {
    name: 'user_delete',
    description: 'Blocked: user deletion must be done in the Transcodes console.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => blocked(MSG_PLATFORM_CONSOLE),
  },
  {
    name: 'organization_get',
    description:
      'Blocked: organization settings, user invitations, and invitation management must be done in the Transcodes console at https://transcodes.io.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => blocked(MSG_ORG_CONSOLE),
  },
  {
    name: 'organization_overview',
    description:
      'Blocked: organization settings, user invitations, and invitation management must be done in the Transcodes console at https://transcodes.io.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => blocked(MSG_ORG_CONSOLE),
  },
  {
    name: 'organization_create',
    description:
      'Blocked: organization settings, user invitations, and invitation management must be done in the Transcodes console at https://transcodes.io.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => blocked(MSG_ORG_CONSOLE),
  },
  {
    name: 'organization_patch',
    description:
      'Blocked: organization settings, user invitations, and invitation management must be done in the Transcodes console at https://transcodes.io.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_id: { type: 'string' },
        body: { type: 'object', additionalProperties: true },
      },
      required: ['organization_id', 'body'],
    },
    handler: async () => blocked(MSG_ORG_CONSOLE),
  },
  {
    name: 'organization_delete',
    description:
      'Blocked: organization settings, user invitations, and invitation management must be done in the Transcodes console at https://transcodes.io.',
    inputSchema: {
      type: 'object',
      properties: { organization_id: { type: 'string' } },
      required: ['organization_id'],
    },
    handler: async () => blocked(MSG_ORG_CONSOLE),
  },
  {
    name: 'organization_invitation_accept',
    description:
      'Blocked: organization settings, user invitations, and invitation management must be done in the Transcodes console at https://transcodes.io.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => blocked(MSG_ORG_CONSOLE),
  },
  {
    name: 'organization_invitation_decline',
    description:
      'Blocked: organization settings, user invitations, and invitation management must be done in the Transcodes console at https://transcodes.io.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => blocked(MSG_ORG_CONSOLE),
  },
  {
    name: 'organization_get_collaborators',
    description:
      'Blocked: organization settings, user invitations, and invitation management must be done in the Transcodes console at https://transcodes.io.',
    inputSchema: {
      type: 'object',
      properties: { organization_id: { type: 'string' } },
      required: ['organization_id'],
    },
    handler: async () => blocked(MSG_ORG_CONSOLE),
  },
  {
    name: 'organization_invite_collaborator',
    description:
      'Blocked: organization settings, user invitations, and invitation management must be done in the Transcodes console at https://transcodes.io.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_id: { type: 'string' },
        body: { type: 'object', additionalProperties: true },
      },
      required: ['organization_id', 'body'],
    },
    handler: async () => blocked(MSG_ORG_CONSOLE),
  },
  {
    name: 'organization_resend_invitation',
    description:
      'Blocked: organization settings, user invitations, and invitation management must be done in the Transcodes console at https://transcodes.io.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_id: { type: 'string' },
        body: { type: 'object', additionalProperties: true },
      },
      required: ['organization_id', 'body'],
    },
    handler: async () => blocked(MSG_ORG_CONSOLE),
  },
  {
    name: 'organization_leave_collaborator',
    description:
      'Blocked: organization settings, user invitations, and invitation management must be done in the Transcodes console at https://transcodes.io.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_id: { type: 'string' },
        body: { type: 'object', additionalProperties: true },
      },
      required: ['organization_id', 'body'],
    },
    handler: async () => blocked(MSG_ORG_CONSOLE),
  },
  {
    name: 'api_keys_list',
    description:
      'Blocked: API keys must be managed in the Transcodes console.',
    inputSchema: {
      type: 'object',
      properties: { organization_id: { type: 'string' } },
      required: ['organization_id'],
    },
    handler: async () => blocked(MSG_PLATFORM_CONSOLE),
  },
  {
    name: 'api_keys_create',
    description:
      'Blocked: API keys must be created in the Transcodes console.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_id: { type: 'string' },
        body: { type: 'object', additionalProperties: true },
      },
      required: ['organization_id', 'body'],
    },
    handler: async () => blocked(MSG_PLATFORM_CONSOLE),
  },
  {
    name: 'api_keys_patch',
    description:
      'Blocked: API keys must be updated in the Transcodes console.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_id: { type: 'string' },
        api_key_id: { type: 'string' },
        body: { type: 'object', additionalProperties: true },
      },
      required: ['organization_id', 'api_key_id', 'body'],
    },
    handler: async () => blocked(MSG_PLATFORM_CONSOLE),
  },
  {
    name: 'api_keys_delete',
    description:
      'Blocked: API keys must be deleted in the Transcodes console.',
    inputSchema: {
      type: 'object',
      properties: {
        organization_id: { type: 'string' },
        api_key_id: { type: 'string' },
      },
      required: ['organization_id', 'api_key_id'],
    },
    handler: async () => blocked(MSG_PLATFORM_CONSOLE),
  },
  {
    name: 'membership_plans',
    description: '공개 플랜 목록.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (_a, config) =>
      req(config, { method: 'GET' }, 'membership_plans'),
  },
  {
    name: 'membership_plans_limits',
    description: '플랜별 제한.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (_a, config) =>
      req(config, { method: 'GET' }, 'membership_plans_limits'),
  },
  {
    name: 'membership_customer_status_by_project',
    description: '프로젝트 기준 구독 (SkipAuth).',
    inputSchema: {
      type: 'object',
      properties: { ...projectProps },
    },
    handler: async (a, config) =>
      req(
        config,
        { method: 'GET', query: { project_id: parse.projectId(a, config) } },
        'membership_customer_status_by_project',
      ),
  },
  {
    name: 'membership_create_checkout_session',
    description:
      'MCP/API-key checkout: POST /v1/membership/mcp/session — creates a Stripe Checkout session via organization API key and returns a one-time redirect URL. ' +
      'Use for plan upgrade or first purchase (e.g. free → standard). ' +
      'Body: price_id from membership_plans; optional mode: "subscription" (default) | "payment" | "setup". ' +
      'The returned URL expires after a short window — redirect the user immediately after receiving it.',
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description: 'CreateCheckoutSessionDto (MCP session): price_id (string, required) — Stripe price ID from membership_plans; mode (string, optional) — "subscription" | "payment" | "setup".',
          properties: {
            price_id: { type: 'string', description: 'Stripe price ID (from membership_plans)' },
            mode: { type: 'string', enum: ['subscription', 'payment', 'setup'], description: 'Checkout mode (default: subscription)' },
          },
          required: ['price_id'],
        },
      },
      required: ['body'],
    },
    handler: async (a, config) =>
      req(config, { method: 'POST', body: a.body }, 'membership_create_checkout_session'),
  },
];
