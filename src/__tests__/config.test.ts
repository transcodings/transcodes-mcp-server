import { describe, it, expect, afterEach, vi } from 'vitest';
import { loadConfig } from '../config.ts';

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

function stubValidEnv() {
  const futureExp = Math.floor(Date.now() / 1000) + 3600;
  vi.stubEnv('TRANSCODES_BACKEND_URL', 'https://api.example.com');
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
  vi.stubEnv('TRANSCODES_BACKEND_ENDPOINTS', '{"get_project":"/project"}');
}

describe('loadConfig', () => {
  it('throws when TRANSCODES_BACKEND_URL is missing', () => {
    vi.stubEnv('TRANSCODES_BACKEND_URL', '');
    vi.stubEnv('TRANSCODES_TOKEN', 'x.y.z');
    expect(() => loadConfig()).toThrow('TRANSCODES_BACKEND_URL is required');
  });

  it('throws when TRANSCODES_TOKEN is missing', () => {
    vi.stubEnv('TRANSCODES_BACKEND_URL', 'https://api.example.com');
    vi.stubEnv('TRANSCODES_TOKEN', '');
    expect(() => loadConfig()).toThrow('TRANSCODES_TOKEN is required');
  });

  it('throws on invalid URL', () => {
    stubValidEnv();
    vi.stubEnv('TRANSCODES_BACKEND_URL', 'not-a-url');
    expect(() => loadConfig()).toThrow('not a valid URL');
  });

  it('strips trailing slash from backendUrl', () => {
    stubValidEnv();
    vi.stubEnv('TRANSCODES_BACKEND_URL', 'https://api.example.com/');
    const config = loadConfig();
    expect(config.backendUrl).toBe('https://api.example.com');
  });

  it('apiBaseV1 = backendUrl + /v1', () => {
    stubValidEnv();
    const config = loadConfig();
    expect(config.apiBaseV1).toBe('https://api.example.com/v1');
  });

  it('sets ids and token from TRANSCODES_TOKEN', () => {
    stubValidEnv();
    const config = loadConfig();
    expect(config.organizationId).toBe('org-1');
    expect(config.projectId).toBe('proj-1');
    expect(config.memberId).toBe('mem-1');
    expect(config.token).toBeTruthy();
  });

  it('parses TRANSCODES_BACKEND_ENDPOINTS JSON into a Map', () => {
    stubValidEnv();
    vi.stubEnv(
      'TRANSCODES_BACKEND_ENDPOINTS',
      '{"get_project":"/project","list_members":"/members"}',
    );
    const config = loadConfig();
    expect(config.endpointMap).toBeInstanceOf(Map);
    expect(config.endpointMap!.get('get_project')).toBe('/project');
    expect(config.endpointMap!.get('list_members')).toBe('/members');
  });

  it('throws on invalid ENDPOINTS JSON (array)', () => {
    stubValidEnv();
    vi.stubEnv('TRANSCODES_BACKEND_ENDPOINTS', '[1,2,3]');
    expect(() => loadConfig()).toThrow('must be valid JSON');
  });

  it('throws when ENDPOINTS values are not strings', () => {
    stubValidEnv();
    vi.stubEnv('TRANSCODES_BACKEND_ENDPOINTS', '{"tool": 123}');
    expect(() => loadConfig()).toThrow('must be valid JSON');
  });

  it('throws when TRANSCODES_BACKEND_ENDPOINTS is missing', () => {
    stubValidEnv();
    vi.stubEnv('TRANSCODES_BACKEND_ENDPOINTS', '');
    expect(() => loadConfig()).toThrow('TRANSCODES_BACKEND_ENDPOINTS is required');
  });

  it('throws when TRANSCODES_BACKEND_ENDPOINTS is an empty object', () => {
    stubValidEnv();
    vi.stubEnv('TRANSCODES_BACKEND_ENDPOINTS', '{}');
    expect(() => loadConfig()).toThrow('at least one tool');
  });
});
