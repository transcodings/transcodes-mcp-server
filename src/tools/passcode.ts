import type { ProxyTool } from './tool-utils.ts';
import { bodyOnlyInputSchema, req } from './tool-utils.ts';

/**
 * Recovery passcode — POST /auth/passcode/create (CreatePasscodeDto in body).
 */
export const passcodeTools: ProxyTool[] = [
  {
    name: 'passcode_create',
    description:
      'Create a recovery passcode (CreatePasscodeDto in body). Use for onboarding, support, or admin provisioning.',
    inputSchema: bodyOnlyInputSchema,
    handler: async (a, config) =>
      req(config, { method: 'POST', body: a.body }, 'passcode_create'),
  },
];
