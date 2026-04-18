import type { ProxyTool } from './tool-utils.ts';
import { blocked, parse, req } from './tool-utils.ts';

const MSG_PORTAL_CONSOLE =
  'The Stripe Customer Portal (plan cancellation, payment method changes, subscription / invoice management, etc.) must be opened from the Transcodes console. This MCP tool does not call the API.';

/**
 * Membership / Stripe subscription tools (MembershipController → /v1/membership/...)
 *
 * Public (no auth): membership_plans, membership_plans_limits
 * Auth required:    membership_create_checkout_session
 * SkipAuth + project_id      (from TRANSCODES_TOKEN pid): membership_customer_status_by_project
 * SkipAuth + organization_id (from TRANSCODES_TOKEN oid): membership_customer_status_by_organization
 * Blocked:          membership_create_portal_session → returns a console-only guidance message
 */
export const membershipTools: ProxyTool[] = [
  {
    name: 'membership_plans',
    description:
      'Returns the full list of available Transcodes membership plans (free, standard, business, enterprise) including price, currency, billing interval, and Stripe product metadata. ' +
      'This is a public endpoint — no authentication required. ' +
      'Use this tool to display plan options to users or to look up the price_id needed for membership_create_checkout_session.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (_a, config) =>
      req(config, { method: 'GET' }, 'membership_plans'),
  },

  {
    name: 'membership_plans_limits',
    description:
      'Returns the resource limits enforced per plan tier. ' +
      'Each plan entry includes: projects (max projects allowed), roles, resources, members (max members per project), and price (monthly USD, null = contact for pricing). ' +
      'Free tier: 1 project / 2 roles / 2 resources / 2 members. ' +
      'Standard: 5 projects / unlimited roles & resources / 10 members. ' +
      'Business & Enterprise: unlimited everything. ' +
      'Use this to build pricing comparison UI or to warn users when they are approaching a limit.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (_a, config) =>
      req(config, { method: 'GET' }, 'membership_plans_limits'),
  },

  {
    name: 'membership_customer_status_by_project',
    description:
      'Returns the active subscription status of the organization that owns the project in TRANSCODES_TOKEN (pid claim). ' +
      'SkipAuth — GET /v1/membership/customer/status/project?project_id=... ' +
      'Useful when the SDK Toolkit only carries a project context.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (_a, config) =>
      req(
        config,
        {
          method: 'GET',
          query: { project_id: config.projectId },
        },
        'membership_customer_status_by_project'
      ),
  },

  {
    name: 'membership_customer_status_by_organization',
    description:
      'Returns the active subscription status for the organization in TRANSCODES_TOKEN (oid claim). ' +
      'SkipAuth — GET /v1/membership/customer/status/organization?organization_id=... ' +
      "Preferred when the caller already knows the organization (avoids the project → organization lookup).",
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async (_a, config) =>
      req(
        config,
        {
          method: 'GET',
          query: { organization_id: config.organizationId },
        },
        'membership_customer_status_by_organization'
      ),
  },

  {
    name: 'membership_create_checkout_session',
    description:
      'MCP checkout: POST /v1/membership/mcp/session — creates a Stripe Checkout session for the organization in TRANSCODES_TOKEN (oid claim) and returns a one-time redirect URL. ' +
      'Use for plan upgrade or first purchase (e.g. free → standard). ' +
      'Body: price_id from membership_plans; optional mode: "subscription" (default) | "payment" | "setup". ' +
      'organization_id is injected automatically from the token — do not pass it. ' +
      'The returned URL expires after a short window — redirect the user immediately after receiving it.',
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description:
            'CreateMcpCheckoutSessionDto: price_id (required) from membership_plans; mode (optional) one of "subscription" (default) | "payment" | "setup". organization_id is set from TRANSCODES_TOKEN by the server.',
          properties: {
            price_id: {
              type: 'string',
              description: 'Stripe price ID (from membership_plans)',
            },
            mode: {
              type: 'string',
              enum: ['subscription', 'payment', 'setup'],
              description: 'Checkout mode (default: subscription)',
            },
          },
          required: ['price_id'],
        },
      },
      required: ['body'],
    },
    handler: async (a, config) =>
      req(
        config,
        {
          method: 'POST',
          body: {
            ...parse.record(a.body),
            organization_id: config.organizationId,
          },
        },
        'membership_create_checkout_session'
      ),
  },

  {
    name: 'membership_create_portal_session',
    description:
      'Blocked: Stripe Customer Portal session must be opened from the Transcodes console (billing / subscription management). ' +
      'This MCP tool does not call the API — use the console for plan cancellation, payment method changes, plan changes, and invoices.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async () => blocked(MSG_PORTAL_CONSOLE),
  },
];
