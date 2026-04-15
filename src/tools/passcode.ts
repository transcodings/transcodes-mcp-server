import type { ProxyTool } from './tool-utils.ts';
import { PROJECT_ID_GUIDANCE, req, requireStepup } from './tool-utils.ts';

/**
 * Recovery passcode — POST /v1/auth/passcode/create (env passcode_create → /auth/passcode/create, body CreatePasscodeDto).
 */
export const passcodeTools: ProxyTool[] = [
  {
    name: 'passcode_create',
    description:
      'Create a recovery passcode (CreatePasscodeDto in body). Requires Step-up MFA. ' +
      'If MFA is not verified, initiate the step-up process first. ' +
      'Use for onboarding, support, or admin provisioning.',
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description: 'Request body (CreatePasscodeDto). ' + PROJECT_ID_GUIDANCE,
          properties: {
            project_id: { type: 'string', description: 'Transcodes project public id' },
            member_id: { type: 'string', description: 'Member public id to create passcode for' },
          },
          required: ['project_id', 'member_id'],
        },
      },
      required: ['body'],
    },
    handler: async (a, config) => {
      const blocked = requireStepup(config);
      if (blocked) return blocked;
      const result = await req(config, { method: 'POST', body: a.body }, 'passcode_create');
      config.verifiedStepup = undefined;
      return result;
    },
  },
];
