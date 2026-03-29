import type { ProxyTool } from './tool-utils.ts';
import { blocked, bodyOnlyInputSchema } from './tool-utils.ts';

const MSG_OTP_WEBSITE =
  'Email OTP must be requested and verified by the user on your website. This MCP tool does not call the API.';

/** Email OTP — blocked; user completes flow in browser */
export const otpTools: ProxyTool[] = [
  {
    name: 'otp_email_create',
    description:
      'Blocked: OTP send must be triggered from your site for the end user.',
    inputSchema: bodyOnlyInputSchema,
    handler: async () => blocked(MSG_OTP_WEBSITE),
  },
  {
    name: 'otp_email_verify',
    description:
      'Blocked: OTP verification must be completed by the user on your website.',
    inputSchema: bodyOnlyInputSchema,
    handler: async () => blocked(MSG_OTP_WEBSITE),
  },
];
