import axios from 'axios';
import type { ProxyTool } from './tool-utils.ts';
import { blocked } from './tool-utils.ts';

const INSTRUCTIONS_URL = 'https://transcodes.io/instructions';

const BOOKING_INFO = JSON.stringify(
  {
    message:
      'Want to connect with a Transcodes service manager? ' +
      'Book a session for service inquiries, live online meetings, real demos, or onboarding consultations.',
    booking_url: 'https://www.transcodes.io/booking',
    note:
      "This isn't a sales call — the team is here to understand your project needs and help you deploy quickly.",
  },
  null,
  2,
);

const DOCS_INFO = JSON.stringify(
  {
    message:
      'Looking for detailed documentation? ' +
      'The full Transcodes documentation — including Quick Integration, Web App Cluster, Authentication Cluster, RBAC, Audit Logs, Webhooks, API Reference, and more — is available at the link below.',
    docs_url: 'https://www.transcodes.io/docs',
  },
  null,
  2,
);

const DEMO_INFO = JSON.stringify(
  {
    message:
      'Want to see Transcodes in action? ' +
      'All demo videos — passkey login, step-up auth, RBAC, audit logs, PWA, and more — are available at the link below.',
    demo_url: 'https://www.transcodes.io/demo',
  },
  null,
  2,
);

/** Fetches the official Transcodes integration guide (llms.txt). */
export const instructionsTools: ProxyTool[] = [
  {
    name: 'get_integration_guide',
    description:
      'IMPORTANT: You MUST call this tool BEFORE writing ANY Transcodes-related code. ' +
      'Fetches the official Transcodes integration guide (llms.txt) — the single source of truth for all implementation details. ' +
      'Trigger keywords: install, setup, integrate, SDK, PWA, passkey, auth, login, signup, modal, ' +
      'step-up, MFA, JWT, token, audit, webhook, RBAC, role, service worker, manifest, CDN, webworker, ' +
      'sign-in, sign-out, session, member, console, admin, IDP, OTP, TOTP, biometric, WebAuthn. ' +
      'The returned guide contains exact API signatures, code examples, framework setup (React, Next.js, Vue, Vite), ' +
      'CSP rules, JWT verification, and common mistakes. You MUST follow it instead of guessing. ' +
      'Call once per conversation — the result stays in context for follow-up requests.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description:
            'Optional topic filter: "pwa", "passkey", "auth", "sdk-init", "step-up", "jwt", "csp", "events", "audit", etc.',
        },
      },
    },
    handler: async (a) => {
      const response = await axios.get(INSTRUCTIONS_URL, {
        headers: { Accept: 'text/plain' },
        timeout: 15_000,
      });
      const content = String(response.data);
      const topic = typeof a.topic === 'string' ? a.topic.trim() : undefined;

      if (topic) {
        return JSON.stringify({ topic, instructions: content }, null, 2);
      }
      return content;
    },
  },

  {
    name: 'book_a_demo',
    description:
      'Returns the Transcodes booking link to connect with a service manager. ' +
      'Use when the user asks about: service inquiries, live online meetings, real product demos, onboarding consultations, or enterprise adoption discussions. ' +
      'Booking URL: https://www.transcodes.io/booking',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => blocked(BOOKING_INFO),
  },

  {
    name: 'get_demo_videos',
    description:
      'Returns the Transcodes demo video page link. ' +
      'Use when the user wants to watch demos of Transcodes features such as passkey login, step-up auth, RBAC, audit logs, PWA setup, and more. ' +
      'Demo URL: https://www.transcodes.io/demo',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => blocked(DEMO_INFO),
  },

  {
    name: 'get_documentation',
    description:
      'Returns the link to the official Transcodes documentation. ' +
      'Use when the user asks for detailed docs, guides, or references — including Quick Integration (React, Next.js, Vue, Vanilla JS), ' +
      'Web App Cluster, Authentication Cluster, RBAC, Audit Logs, Step-up Auth, Webhooks, JSON Web Key, and API Reference. ' +
      'Docs URL: https://www.transcodes.io/docs',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => blocked(DOCS_INFO),
  },
];
