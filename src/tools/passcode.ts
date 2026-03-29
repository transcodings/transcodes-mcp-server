import type { ProxyTool } from './tool-utils.ts';
import { blocked, bodyOnlyInputSchema } from './tool-utils.ts';

const MSG_PASSCODE_CONSOLE =
  'Recovery passcode management must be done in the Transcodes console. This MCP tool does not call the API.';

/** Recovery passcodes — blocked; use Transcodes console */
export const passcodeTools: ProxyTool[] = [
  {
    name: 'passcode_create',
    description:
      'Blocked: create recovery passcode in the Transcodes console only.',
    inputSchema: bodyOnlyInputSchema,
    handler: async () => blocked(MSG_PASSCODE_CONSOLE),
  },
  {
    name: 'passcode_update',
    description:
      'Blocked: passcode rotation must be done in the Transcodes console / user flow.',
    inputSchema: bodyOnlyInputSchema,
    handler: async () => blocked(MSG_PASSCODE_CONSOLE),
  },
];
