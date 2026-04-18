import type { ProxyTool } from './tool-utils.ts';
import { req } from './tool-utils.ts';

export const proxyTools: ProxyTool[] = [
  {
    name: 'start_tunnel',
    description:
      'Starts a local HTTP MCP server (Streamable HTTP) on a random free port and returns http://localhost:<port>/mcp. ' +
      'Use this for clients that speak MCP over HTTP on the same machine; public tunnels are not started here.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async (_args, config) => {
      const port = 0; // 0 = OS assigns a random free port
      try {
        const { startHttpServer } = await import('../http-server.ts');
        const actualPort = await startHttpServer(port, config);
        return JSON.stringify(
          {
            ok: true,
            url: `http://localhost:${actualPort}/mcp`,
          },
          null,
          2
        );
      } catch (err) {
        return JSON.stringify(
          {
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          },
          null,
          2
        );
      }
    },
  },
  {
    name: 'stop_tunnel',
    description: 'Stops the local HTTP MCP server if it is running.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const { stopHttpServer, getHttpServerStatus } = await import(
        '../http-server.ts'
      );
      if (!('url' in getHttpServerStatus())) {
        return JSON.stringify({ ok: true, message: 'Not running.' }, null, 2);
      }
      stopHttpServer();
      return JSON.stringify({ ok: true, message: 'Stopped.' }, null, 2);
    },
  },
  {
    name: 'get_tunnel_status',
    description:
      'Returns whether the local HTTP MCP server is running and its http://localhost URL if so.',
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const { getHttpServerStatus } = await import('../http-server.ts');
      return JSON.stringify({ ok: true, ...getHttpServerStatus() }, null, 2);
    },
  },
  {
    name: 'get_current_project_id',
    description:
      'Returns the currently active project ID (from env or previously set via set_current_project_id). ' +
      'Call this tool first when you need the project ID instead of asking the user.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (_args, config) => {
      const projectId = config.projectId;
      if (!projectId) {
        return JSON.stringify(
          {
            ok: false,
            message:
              'No project ID is configured. Ask the user for the project ID, then call set_current_project_id to store it for this session.',
          },
          null,
          2
        );
      }
      return JSON.stringify({ ok: true, project_id: projectId }, null, 2);
    },
  },

  {
    name: 'set_current_project_id',
    description:
      'Sets the active project ID for this MCP server session. ' +
      'Use when the user provides a project ID and TRANSCODES_PROJECT_ID was not pre-configured. ' +
      'Once set, all subsequent tool calls will use this project ID as the default.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description:
            'The Transcodes project public ID to use for this session.',
        },
      },
      required: ['project_id'],
    },
    handler: async (args, config) => {
      const id =
        typeof args.project_id === 'string' ? args.project_id.trim() : '';
      if (!id) {
        return JSON.stringify(
          { ok: false, message: 'project_id is required.' },
          null,
          2
        );
      }
      config.projectId = id;
      return JSON.stringify(
        {
          ok: true,
          project_id: id,
          message:
            'Project ID set for this session. All tools will now use this ID by default.',
        },
        null,
        2
      );
    },
  },
  {
    name: 'get_current_member_email',
    description:
      'Returns the member email used for this MCP session (from env or previously set via set_member_email). ' +
      'Call when you need the configured email instead of asking the user.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (_args, config) => {
      const email = config.memberEmail;
      if (!email) {
        return JSON.stringify(
          {
            ok: false,
            message:
              'No member email configured. Set TRANSCODES_MEMBER_EMAIL in the MCP env or call set_member_email.',
          },
          null,
          2
        );
      }
      return JSON.stringify({ ok: true, email }, null, 2);
    },
  },
  {
    name: 'set_member_email',
    description:
      'Sets the member email for this MCP server session. ' +
      'Use when the user provides an email and TRANSCODES_MEMBER_EMAIL was not pre-configured. ' +
      'Once set, get_my_profile, create_stepup_session (without member_id), and other tools use this email by default.',
    inputSchema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'The member email address to use for this session.',
        },
      },
      required: ['email'],
    },
    handler: async (args, config) => {
      const email = typeof args.email === 'string' ? args.email.trim() : '';
      if (!email) {
        return JSON.stringify(
          { ok: false, message: 'email is required.' },
          null,
          2
        );
      }
      config.memberEmail = email;
      return JSON.stringify(
        {
          ok: true,
          email,
          message:
            'Member email set for this session. Tools that rely on member email will use this value.',
        },
        null,
        2
      );
    },
  },
  {
    name: 'get_my_profile',
    description:
      'Returns the profile of the currently configured member (from TRANSCODES_MEMBER_EMAIL env or set_member_email). ' +
      'Use when the user asks "who am I", "show my profile", or "show my member info". ' +
      'No arguments needed.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (_args, config) => {
      const email = config.memberEmail;
      if (!email) {
        return JSON.stringify(
          {
            ok: false,
            message:
              'No member email configured. Set TRANSCODES_MEMBER_EMAIL in the MCP env block.',
          },
          null,
          2
        );
      }
      const projectId = config.projectId;
      if (!projectId) {
        return JSON.stringify(
          {
            ok: false,
            message:
              'No project ID configured. Set TRANSCODES_PROJECT_ID in the MCP env block.',
          },
          null,
          2
        );
      }
      return req(
        config,
        { method: 'GET', query: { project_id: projectId, email } },
        'get_member'
      );
    },
  },
];
