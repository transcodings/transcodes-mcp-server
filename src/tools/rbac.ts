import type { ProxyTool } from './tool-utils.ts';
import {
  blocked,
  bodyOnlyInputSchema,
  parse,
  projectProps,
  req,
} from './tool-utils.ts';

const MSG_DELETE_RBAC_CONSOLE =
  'Deleting roles and resources must be done in the Transcodes console. This MCP tool does not call the API.';

/** RBAC — maps to RoleController */
export const rbacTools: ProxyTool[] = [
  {
    name: 'get_roles',
    description:
      'List all roles and permission matrix for a project. Use when you need RBAC data for console parity or to know which roles can be assigned.',
    inputSchema: { type: 'object', properties: { ...projectProps } },
    handler: async (a, config) =>
      req(
        config,
        { method: 'GET', query: { project_id: parse.projectId(a, config) } },
        'get_roles',
      ),
  },
  {
    name: 'create_role',
    description:
      'Create a new role (CreateRoleDto). Use before set_role_permissions to fill per-resource access.',
    inputSchema: bodyOnlyInputSchema,
    handler: async (a, config) =>
      req(config, { method: 'POST', body: a.body }, 'create_role'),
  },
  {
    name: 'update_role',
    description: 'Update role metadata and step-up policy (UpdateRoleDto).',
    inputSchema: {
      type: 'object',
      properties: {
        role_id: { type: 'string' },
        body: { type: 'object', additionalProperties: true },
      },
      required: ['role_id', 'body'],
    },
    handler: async (a, config) =>
      req(
        config,
        { method: 'PUT', body: a.body },
        'update_role',
        `/${String(a.role_id)}`,
      ),
  },
  {
    name: 'delete_role',
    description:
      'Blocked: role deletion must be done in the Transcodes console only.',
    inputSchema: {
      type: 'object',
      properties: {
        role_id: { type: 'string' },
        body: { type: 'object', additionalProperties: true },
      },
      required: ['role_id', 'body'],
    },
    handler: async () => blocked(MSG_DELETE_RBAC_CONSOLE),
  },
  {
    name: 'set_role_permissions',
    description:
      'Set per-resource permission matrix for a role. 0=deny, 1=allow, 2=allow+step-up.',
    inputSchema: {
      type: 'object',
      properties: {
        role_id: { type: 'string' },
        body: { type: 'object', additionalProperties: true },
      },
      required: ['role_id', 'body'],
    },
    handler: async (a, config) =>
      req(
        config,
        { method: 'PUT', body: a.body },
        'set_role_permissions',
        `/${String(a.role_id)}/permissions`,
      ),
  },
  {
    name: 'update_member_role',
    description: "Change a member's assigned role (UpdateMemberRoleDto).",
    inputSchema: bodyOnlyInputSchema,
    handler: async (a, config) =>
      req(config, { method: 'PUT', body: a.body }, 'update_member_role'),
  },
  {
    name: 'check_rbac_permission',
    description:
      'Simulate whether a member may access a resource+action (SkipAuth). Returns denied/allowed; if allowed, may include stepUpRequired. Use for guard/debugging before routing.',
    inputSchema: bodyOnlyInputSchema,
    handler: async (a, config) =>
      req(config, { method: 'POST', body: a.body }, 'check_rbac_permission'),
  },
  {
    name: 'get_resources',
    description:
      'List RBAC resource keys for a project. Use before editing roles or building permission UI.',
    inputSchema: { type: 'object', properties: { ...projectProps } },
    handler: async (a, config) =>
      req(
        config,
        { method: 'GET', query: { project_id: parse.projectId(a, config) } },
        'get_resources',
      ),
  },
  {
    name: 'create_resource',
    description:
      'Add a new resource key (CreateResourceDto). New resources default to deny (0) for all roles.',
    inputSchema: bodyOnlyInputSchema,
    handler: async (a, config) =>
      req(config, { method: 'POST', body: a.body }, 'create_resource'),
  },
  {
    name: 'update_resource',
    description:
      'Update resource label/description (UpdateResourceDto). Key stays the same.',
    inputSchema: {
      type: 'object',
      properties: {
        resource_key: { type: 'string' },
        body: { type: 'object', additionalProperties: true },
      },
      required: ['resource_key', 'body'],
    },
    handler: async (a, config) =>
      req(
        config,
        { method: 'PATCH', body: a.body },
        'update_resource',
        `/${encodeURIComponent(String(a.resource_key))}`,
      ),
  },
  {
    name: 'delete_resource',
    description:
      'Blocked: resource deletion must be done in the Transcodes console only.',
    inputSchema: {
      type: 'object',
      properties: {
        resource_key: { type: 'string' },
        ...projectProps,
      },
      required: ['resource_key'],
    },
    handler: async () => blocked(MSG_DELETE_RBAC_CONSOLE),
  },
];
