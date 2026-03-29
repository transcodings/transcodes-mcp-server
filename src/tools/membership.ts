import type { ProxyTool } from './tool-utils.ts';
import { blocked, parse, projectProps, req } from './tool-utils.ts';

const MSG_PORTAL_CONSOLE =
  'Stripe Customer Portal(플랜 취소, 결제 수단 변경, 구독·청구서 등)는 Transcodes 콘솔에서 직접 이용하세요. 이 MCP 도구는 API를 호출하지 않습니다.';

/**
 * Membership / Stripe subscription tools (MembershipController → /v1/membership/...)
 *
 * Public (no auth): membership_plans, membership_plans_limits
 * Auth required:    membership_create_checkout_session
 * SkipAuth + project_id: membership_customer_status_by_project
 * Blocked:          membership_create_portal_session → 콘솔 전용 안내만 반환
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
      'Returns the active subscription status of the organization that owns the given project. ' +
      'Accepts project_id (or TRANSCODES_PROJECT_ID env); SkipAuth. ' +
      "Primarily used internally by the SDK Toolkit to determine which features to enable at runtime based on the owning organization's plan.",
    inputSchema: {
      type: 'object',
      properties: {
        ...projectProps,
      },
      required: [],
    },
    handler: async (a, config) =>
      req(
        config,
        {
          method: 'GET',
          query: { project_id: parse.projectId(a, config) },
        },
        'membership_customer_status_by_project'
      ),
  },

  {
    name: 'membership_create_checkout_session',
    description:
      "MCP/API-key checkout: POST /v1/membership/mcp/session — creates a Stripe Checkout session via organization API key and returns a one-time redirect URL. " +
      "Use for plan upgrade or first purchase (e.g. free → standard). " +
      'Body: price_id from membership_plans; optional mode: "subscription" (default) | "payment" | "setup". ' +
      'The returned URL expires after a short window — redirect the user immediately after receiving it.',
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description:
            'CreateCheckoutSessionDto (MCP session): price_id (string, required) — Stripe price ID from membership_plans; mode (string, optional) — "subscription" | "payment" | "setup".',
          additionalProperties: true,
        },
      },
      required: ['body'],
    },
    handler: async (a, config) =>
      req(
        config,
        {
          method: 'POST',
          body: a.body,
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
