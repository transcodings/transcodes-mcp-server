/**
 * SDK 내부 기본값.
 *
 * 고객은 MCP 클라이언트 env 로 override 할 수 있지만, 일반적인 경우에는
 * `TRANSCODES_TOKEN` 만 설정하면 됨. `TRANSCODES_BACKEND_URL` 과
 * `TRANSCODES_BACKEND_ENDPOINTS` 는 여기 정의된 기본값으로 폴백됨.
 *
 * 이 값들은 과거(v1.x) GitHub Actions release workflow 가 빌드 시점에
 * 소스 파일에 문자열 치환으로 주입하던 것과 동일한 값. THT-260 에서 CI 치환을
 * 제거하고 동일한 값을 레포 내 상수로 옮겨 (1) runtime env override 가 실제로
 * 동작하고 (2) 레포에서 값이 visible 해 유지보수가 가능해짐.
 *
 * Override 예시 (dev):
 *   TRANSCODES_BACKEND_URL=http://localhost:3500
 *   TRANSCODES_BACKEND_ENDPOINTS='{"get_project":"/project"}'
 */

export const DEFAULT_BACKEND_URL = 'https://transcodesapis.com';

/**
 * MCP tool 이름 → `/v1` 뒤 API path 맵 (JSON 문자열).
 * 경로 `"*"` 는 내장 tool (백엔드 호출 없음) 을 의미.
 * `config.ts` 의 `parseEndpointMapJson()` 에서 Map 으로 변환됨.
 */
export const DEFAULT_ENDPOINT_MAP_JSON = JSON.stringify({
  // Meta / built-in tools (경로 없음)
  get_integration_guide: '*',
  book_a_demo: '*',
  get_demo_videos: '*',
  get_documentation: '*',
  transcodes_http_request: '*',

  // Project
  get_project: '/project',

  // Audit
  get_security_logs: '/audit/logs',

  // Members
  get_member: '/auth/member',
  list_members_paginated: '/auth/members/list',
  list_member_devices: '/auth/members/devices',
  create_member: '/auth/member',
  update_member: '/auth/member',
  retire_member: '/auth/member',
  get_member_suspension: '/auth/member/revocation',
  suspend_member: '/auth/member/revocation',
  unsuspend_member: '/auth/member/revocation',

  // Auth devices — authenticators
  get_authenticator: '/auth/authenticator',
  list_authenticators: '/auth/authenticators',
  authenticators_register: '/auth/authenticators/register',
  authenticators_update: '/auth/authenticators/update',
  authenticators_revoke: '/auth/authenticators/delete',

  // Auth devices — passkeys
  list_passkeys: '/auth/passkeys',
  passkeys_register: '/auth/passkeys/register',
  passkeys_update: '/auth/passkeys/update',
  passkeys_revoke: '/auth/passkeys/delete',

  // Auth devices — TOTP
  list_totps: '/auth/totps',
  totp_create: '/auth/totp',
  totp_update: '/auth/totp/update',
  totp_revoke: '/auth/totp/delete',

  // OTP / passcode
  otp_email_create: '/auth/otp/email/create',
  otp_email_verify: '/auth/otp/email/verify',
  passcode_create: '/auth/passcode/create',

  // RBAC — roles
  get_roles: '/auth/roles',
  create_role: '/auth/role',
  update_role: '/auth/role',
  retire_role: '/auth/role',
  set_role_permissions: '/auth/role',
  update_member_role: '/auth/member/role',
  check_rbac_permission: '/auth/role/check-permission',

  // RBAC — resources
  get_resources: '/auth/resources',
  create_resource: '/auth/resources',
  update_resource: '/auth/resources',
  retire_resource: '/auth/resources',

  // Membership / billing
  membership_plans: '/membership/plans',
  membership_plans_limits: '/membership/plans/limits',
  membership_customer_status_by_project: '/membership/customer/status/project',
  membership_customer_status_by_organization:
    '/membership/customer/status/organization',
  membership_create_checkout_session: '/membership/mcp/session',
  membership_create_portal_session: '/membership/portal',

  // Step-up auth (temp session)
  create_stepup_session: '/auth/temp-session/step-up/session',
  poll_stepup_session: '/auth/temp-session/step-up/session',
});
