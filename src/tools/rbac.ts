import type { ProxyTool } from './tool-utils.ts';
import {
  PROJECT_ID_GUIDANCE,
  req,
  requireStepup,
} from './tool-utils.ts';

// retire_role: DELETE …/role/:role_id + body { project_id }. retire_resource: DELETE …/resources/:key + ?project_id (no body). Call after step-up.

/** RBAC — maps to RoleController */
export const rbacTools: ProxyTool[] = [
  {
    name: 'get_roles',
    description:
      'List all roles and permission matrix for a project. Use when you need RBAC data for console parity or to know which roles can be assigned.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (_a, config) =>
      req(
        config,
        { method: 'GET', query: { project_id: config.projectId } },
        'get_roles',
      ),
  },
  {
    name: 'create_role',
    description:
      'Create a new role (CreateRoleDto). Use before set_role_permissions to fill per-resource access.',
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description: 'Request body (CreateRoleDto). ' + PROJECT_ID_GUIDANCE,
          properties: {
            project_id: { type: 'string', description: 'Transcodes project public id' },
            name: { type: 'string', description: 'Role name (lowercase alphanumeric + hyphens, 2-50 chars)' },
            description: { type: 'string', description: 'Role description (optional, max 500 chars)' },
          },
          required: ['project_id', 'name'],
        },
      },
      required: ['body'],
    },
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
        body: {
          type: 'object',
          description: 'Request body (UpdateRoleDto). ' + PROJECT_ID_GUIDANCE,
          properties: {
            project_id: { type: 'string', description: 'Transcodes project public id' },
            description: { type: 'string', description: 'Role description (max 500 chars)' },
          },
          required: ['project_id'],
        },
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
    name: 'retire_role',
    description:
      'Retire a role from the project. Use when the user wants to remove, drop, or discard a role. ' +
      'Verified action — requires step-up MFA. Body: { project_id } — required.',
    inputSchema: {
      type: 'object',
      properties: {
        role_id: { type: 'string' },
        body: {
          type: 'object',
          description: 'Request body. ' + PROJECT_ID_GUIDANCE,
          properties: {
            project_id: { type: 'string', description: 'Transcodes project public id' },
          },
          required: ['project_id'],
        },
      },
      required: ['role_id', 'body'],
    },
    handler: async (a, config) => {
      const blocked = requireStepup(config);
      if (blocked) return blocked;
      const result = await req(
        config,
        { method: 'DELETE', body: a.body },
        'retire_role',
        `/${String(a.role_id)}`,
      );
      config.verifiedStepup = undefined;
      return result;
    },
  },
  {
    name: 'set_role_permissions',
    description:
      'Set per-resource permission matrix for a role. 0=deny, 1=allow, 2=allow+step-up. ' +
      'Verified action — requires step-up MFA.',
    inputSchema: {
      type: 'object',
      properties: {
        role_id: { type: 'string' },
        body: {
          type: 'object',
          description: 'Request body (UpdateRolePermissionsDto). ' + PROJECT_ID_GUIDANCE,
          properties: {
            project_id: { type: 'string', description: 'Transcodes project public id' },
            permissions: {
              type: 'object',
              description: 'Resource-key → { create, read, update, delete } map. Each action value: 0=deny, 1=allow, 2=allow+step-up',
              additionalProperties: {
                type: 'object',
                properties: {
                  create: { type: 'number', enum: [0, 1, 2] },
                  read: { type: 'number', enum: [0, 1, 2] },
                  update: { type: 'number', enum: [0, 1, 2] },
                  delete: { type: 'number', enum: [0, 1, 2] },
                },
              },
            },
          },
          required: ['project_id', 'permissions'],
        },
      },
      required: ['role_id', 'body'],
    },
    handler: async (a, config) => {
      const blocked = requireStepup(config);
      if (blocked) return blocked;
      const result = await req(
        config,
        { method: 'PUT', body: a.body },
        'set_role_permissions',
        `/${String(a.role_id)}/permissions`,
      );
      config.verifiedStepup = undefined;
      return result;
    },
  },
  {
    name: 'update_member_role',
    description:
      "Change a member's assigned role (UpdateMemberRoleDto). " +
      'Verified action — requires step-up MFA.',
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description: 'Request body (UpdateMemberRoleDto). ' + PROJECT_ID_GUIDANCE,
          properties: {
            project_id: { type: 'string', description: 'Transcodes project public id' },
            member_id: { type: 'string', description: 'Member public id' },
            role: { type: 'string', description: 'Role name to assign (lowercase alphanumeric + hyphens)' },
          },
          required: ['project_id', 'member_id', 'role'],
        },
      },
      required: ['body'],
    },
    handler: async (a, config) => {
      const blocked = requireStepup(config);
      if (blocked) return blocked;
      const result = await req(config, { method: 'PUT', body: a.body }, 'update_member_role');
      config.verifiedStepup = undefined;
      return result;
    },
  },
  {
    name: 'check_rbac_permission',
    description:
      'Simulate whether a member may access a resource+action (SkipAuth). Returns denied/allowed; if allowed, may include stepUpRequired. Use for guard/debugging before routing.',
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description: 'Request body (CheckRbacPermissionDto). ' + PROJECT_ID_GUIDANCE,
          properties: {
            project_id: { type: 'string', description: 'Transcodes project public id' },
            member_id: { type: 'string', description: 'Member public id' },
            resource: { type: 'string', description: 'Resource key to check' },
            action: { type: 'string', enum: ['create', 'read', 'update', 'delete'], description: 'CRUD action to check' },
          },
          required: ['project_id', 'member_id', 'resource', 'action'],
        },
      },
      required: ['body'],
    },
    handler: async (a, config) =>
      req(config, { method: 'POST', body: a.body }, 'check_rbac_permission'),
  },
  {
    name: 'get_resources',
    description:
      'List RBAC resource keys for a project. Use before editing roles or building permission UI.',
    inputSchema: { type: 'object', properties: {} },
    handler: async (_a, config) =>
      req(
        config,
        { method: 'GET', query: { project_id: config.projectId } },
        'get_resources',
      ),
  },
  {
    name: 'create_resource',
    description:
      'Add a new resource key (CreateResourceDto). New resources default to deny (0) for all roles.',
    inputSchema: {
      type: 'object',
      properties: {
        body: {
          type: 'object',
          description: 'Request body (CreateResourceDto). ' + PROJECT_ID_GUIDANCE,
          properties: {
            project_id: { type: 'string', description: 'Transcodes project public id' },
            key: { type: 'string', description: 'Resource key (lowercase alphanumeric + hyphens, max 50 chars)' },
            name: { type: 'string', description: 'Display name (max 100 chars)' },
            description: { type: 'string', description: 'Resource description (optional, max 500 chars)' },
          },
          required: ['project_id', 'key', 'name'],
        },
      },
      required: ['body'],
    },
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
        body: {
          type: 'object',
          description: 'Request body (UpdateResourceDto). ' + PROJECT_ID_GUIDANCE,
          properties: {
            project_id: { type: 'string', description: 'Transcodes project public id' },
            description: { type: 'string', description: 'Resource description (max 500 chars)' },
          },
          required: ['project_id'],
        },
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
    name: 'retire_resource',
    description:
      'Retire a resource key from the project. Use when the user wants to remove, drop, or discard a resource. ' +
      'Verified action — requires step-up MFA. Path: resource_key. Query: project_id. No JSON body.',
    inputSchema: {
      type: 'object',
      properties: {
        resource_key: { type: 'string' },
      },
      required: ['resource_key'],
    },
    handler: async (a, config) => {
      const blocked = requireStepup(config);
      if (blocked) return blocked;
      const result = await req(
        config,
        {
          method: 'DELETE',
          query: { project_id: config.projectId },
          omitBody: true,
        },
        'retire_resource',
        `/${encodeURIComponent(String(a.resource_key))}`,
      );
      config.verifiedStepup = undefined;
      return result;
    },
  },
];
