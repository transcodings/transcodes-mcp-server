/**
 * Step-up 인증 MCP 도구.
 * create_stepup_session → 유저가 브라우저에서 MFA 완료 후 알림 → poll_stepup_session 으로 확인 (주기적 대기 루프 없음).
 *
 * 백엔드 엔드포인트(env base 동일, poll 은 pathSuffix 로 /:sid):
 *   POST …/step-up/session → create_stepup_session (comment: 한 문장, Step-up UI 표시)
 *   GET  /v1/auth/temp-session/step-up/session/:sid     → poll_stepup_session
 */
import type { ProxyTool } from './tool-utils.ts';
import {
  parse,
  projectProps,
  req,
  resolveMemberIdByEmail,
} from './tool-utils.ts';
import type { ProxyConfig } from '../config.ts';

/** poll 응답에서 step-up 상태 문자열(pending | verified)만 추출 */
function extractPollStepStatus(parsed: unknown): string | undefined {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return undefined;
  }
  const root = parsed as Record<string, unknown>;
  const data = root['data'];
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return undefined;
  }
  const inner = data as Record<string, unknown>;
  const pl = inner['payload'];
  if (!Array.isArray(pl) || pl.length === 0) return undefined;
  const first = pl[0];
  if (first === null || typeof first !== 'object' || Array.isArray(first)) {
    return undefined;
  }
  const st = (first as Record<string, unknown>)['status'];
  return typeof st === 'string' ? st : undefined;
}

/** member_id 인자 또는 config.memberEmail로 member_id 확정 */
async function resolveMemberIdForStepup(
  a: Record<string, unknown>,
  config: ProxyConfig,
): Promise<{ member_id: string } | { error: string }> {
  const projectId = parse.projectId(a, config);
  const explicit = parse.str(a, 'member_id');
  if (explicit) return { member_id: explicit };
  const email = config.memberEmail;
  if (!email) {
    return {
      error:
        'member_id is required; provide it as an argument, ' +
        'or set TRANSCODES_MEMBER_EMAIL / set_member_email',
    };
  }
  return resolveMemberIdByEmail(config, projectId, email);
}

export const stepupTools: ProxyTool[] = [
  {
    name: 'create_stepup_session',
    description:
      'Create a step-up MFA session before a sensitive operation; returns sid, browser URL, expiry; ' +
      'Required: comment — one short sentence for the step-up screen explaining why MFA is needed; ' +
      'send the URL, ask the user to finish MFA and tell you when done (no polling loop); then poll_stepup_session, TTL 10 minutes',
    inputSchema: {
      type: 'object',
      properties: {
        ...projectProps,
        member_id: {
          type: 'string',
          description:
            'Member public ID to authenticate; ' +
            'if omitted, resolved from TRANSCODES_MEMBER_EMAIL or set_member_email',
        },
        action: {
          type: 'string',
          description: 'Action identifier to include in the audit log (e.g. "revoke")',
        },
        resource: {
          type: 'string',
          description: 'Protected resource identifier to include in the audit log (e.g. "billing")',
        },
        comment: {
          type: 'string',
          description:
            'One short sentence shown in the step-up UI (e.g. "Confirm revoking member kim@example.com")',
        },
      },
      required: ['comment'],
    },
    handler: async (a, config) => {
      const resolved = await resolveMemberIdForStepup(a, config);
      if ('error' in resolved) {
        return JSON.stringify({ ok: false, message: resolved.error }, null, 2);
      }
      const { member_id } = resolved;

      const comment = parse.str(a, 'comment');
      if (!comment || !comment.trim()) {
        return JSON.stringify(
          {
            ok: false,
            message: 'comment is required: one short sentence for the step-up UI',
          },
          null,
          2,
        );
      }

      return req(
        config,
        {
          method: 'POST',
          body: {
            project_id: parse.projectId(a, config),
            member_id,
            action: parse.str(a, 'action'),
            resource: parse.str(a, 'resource'),
            comment: comment.trim(),
          },
        },
        'create_stepup_session',
      );
    },
  },

  {
    name: 'poll_stepup_session',
    description:
      'Check the current status of a step-up MFA session (single GET); ' +
      'returns status "pending" or "verified", or 404 if the session has expired (TTL 10 minutes); ' +
      'call after the user says they finished browser MFA — not on a fixed interval',
    inputSchema: {
      type: 'object',
      properties: {
        sid: {
          type: 'string',
          description: 'The session ID (mcpup_...) returned from create_stepup_session',
        },
      },
      required: ['sid'],
    },
    handler: async (a, config) => {
      const sid = parse.str(a, 'sid');
      if (!sid) {
        return JSON.stringify({
          ok: false,
          message: 'sid is required',
        }, null, 2);
      }

      const raw = await req(
        config,
        { method: 'GET' },
        'poll_stepup_session',
        `/${sid}`,
      );

      try {
        const parsed: unknown = JSON.parse(raw);
        // axios 래퍼: { ok, status: HTTP코드, data: 백엔드본문 }. step-up 문자열은 data.payload[0].status 에만 온다.
        // 최상위 status 는 200 등 숫자라서 여기 쓰면 verified 를 절대 인식하지 못함.
        const stepStatus = extractPollStepStatus(parsed);
        if (stepStatus === 'verified') {
          config.verifiedStepup = { sid, verifiedAt: Date.now() };
        }
      } catch {
        /* 파싱 실패해도 원본 응답은 반환 */
      }

      return raw;
    },
  },
];
