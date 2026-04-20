import { describe, it, expect, afterEach, vi } from 'vitest';
import { loadConfig } from '../config.ts';
import {
  DEFAULT_BACKEND_URL,
  DEFAULT_ENDPOINT_MAP_JSON,
} from '../constants.ts';

afterEach(() => {
  vi.unstubAllEnvs();
});

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString(
    'base64url',
  );
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.x`;
}

function stubValidToken() {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  vi.stubEnv(
    'TRANSCODES_TOKEN',
    makeJwt({
      oid: 'org-1',
      pid: 'proj-1',
      mid: 'mem-1',
      aud: 'transcodes-mcp',
      exp: futureExp,
    }),
  );
}

describe('loadConfig', () => {
  it('throws when TRANSCODES_TOKEN is missing', () => {
    vi.stubEnv('TRANSCODES_BACKEND_URL', 'https://api.example.com');
    vi.stubEnv('TRANSCODES_TOKEN', '');
    expect(() => loadConfig()).toThrow('TRANSCODES_TOKEN is required');
  });

  it('falls back to DEFAULT_BACKEND_URL when TRANSCODES_BACKEND_URL is missing', () => {
    stubValidToken();
    vi.stubEnv('TRANSCODES_BACKEND_URL', '');
    const config = loadConfig();
    expect(config.backendUrl).toBe(DEFAULT_BACKEND_URL);
    expect(config.apiBaseV1).toBe(`${DEFAULT_BACKEND_URL}/v1`);
  });

  it('env TRANSCODES_BACKEND_URL overrides the default', () => {
    stubValidToken();
    vi.stubEnv('TRANSCODES_BACKEND_URL', 'https://api.example.com');
    const config = loadConfig();
    expect(config.backendUrl).toBe('https://api.example.com');
  });

  it('throws on invalid URL', () => {
    stubValidToken();
    vi.stubEnv('TRANSCODES_BACKEND_URL', 'not-a-url');
    expect(() => loadConfig()).toThrow('not a valid URL');
  });

  it('strips trailing slash from backendUrl', () => {
    stubValidToken();
    vi.stubEnv('TRANSCODES_BACKEND_URL', 'https://api.example.com/');
    const config = loadConfig();
    expect(config.backendUrl).toBe('https://api.example.com');
  });

  it('sets ids and token from TRANSCODES_TOKEN', () => {
    stubValidToken();
    vi.stubEnv('TRANSCODES_BACKEND_URL', 'https://api.example.com');
    const config = loadConfig();
    expect(config.organizationId).toBe('org-1');
    expect(config.projectId).toBe('proj-1');
    expect(config.memberId).toBe('mem-1');
    expect(config.token).toBeTruthy();
  });

  it('falls back to DEFAULT_ENDPOINT_MAP_JSON when TRANSCODES_BACKEND_ENDPOINTS is missing', () => {
    stubValidToken();
    vi.stubEnv('TRANSCODES_BACKEND_URL', 'https://api.example.com');
    vi.stubEnv('TRANSCODES_BACKEND_ENDPOINTS', '');
    const config = loadConfig();
    const defaults: Record<string, string> = JSON.parse(DEFAULT_ENDPOINT_MAP_JSON);
    expect(config.endpointMap.size).toBe(Object.keys(defaults).length);
    // spot check a handful of known entries
    expect(config.endpointMap.get('get_project')).toBe('/project');
    expect(config.endpointMap.get('get_member')).toBe('/auth/member');
    expect(config.endpointMap.get('membership_plans')).toBe('/membership/plans');
  });

  it('env TRANSCODES_BACKEND_ENDPOINTS overrides the default', () => {
    stubValidToken();
    vi.stubEnv('TRANSCODES_BACKEND_URL', 'https://api.example.com');
    vi.stubEnv(
      'TRANSCODES_BACKEND_ENDPOINTS',
      '{"get_project":"/project","list_members":"/members"}',
    );
    const config = loadConfig();
    expect(config.endpointMap.size).toBe(2);
    expect(config.endpointMap.get('get_project')).toBe('/project');
    expect(config.endpointMap.get('list_members')).toBe('/members');
  });

  it('throws on invalid ENDPOINTS JSON (array)', () => {
    stubValidToken();
    vi.stubEnv('TRANSCODES_BACKEND_URL', 'https://api.example.com');
    vi.stubEnv('TRANSCODES_BACKEND_ENDPOINTS', '[1,2,3]');
    expect(() => loadConfig()).toThrow('must be valid JSON');
  });

  it('throws when ENDPOINTS values are not strings', () => {
    stubValidToken();
    vi.stubEnv('TRANSCODES_BACKEND_URL', 'https://api.example.com');
    vi.stubEnv('TRANSCODES_BACKEND_ENDPOINTS', '{"tool": 123}');
    expect(() => loadConfig()).toThrow('must be valid JSON');
  });

  it('throws when env-provided ENDPOINTS is an empty object', () => {
    // 빈 문자열은 default 로 폴백되지만, 명시적 `{}` 는 invalid 로 취급.
    stubValidToken();
    vi.stubEnv('TRANSCODES_BACKEND_URL', 'https://api.example.com');
    vi.stubEnv('TRANSCODES_BACKEND_ENDPOINTS', '{}');
    expect(() => loadConfig()).toThrow('at least one tool');
  });
});
