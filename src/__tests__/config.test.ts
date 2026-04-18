import { describe, it, expect, afterEach, vi } from 'vitest';
import { loadConfig } from '../config.ts';

afterEach(() => {
  vi.unstubAllEnvs();
});

/** Stub the minimum valid environment variables */
function stubValidEnv() {
  vi.stubEnv('TRANSCODES_BACKEND_URL', 'https://api.example.com');
  vi.stubEnv('TRANSCODES_API_KEY', 'test-key');
}

describe('loadConfig', () => {
  it('throws when TRANSCODES_BACKEND_URL is missing', () => {
    vi.stubEnv('TRANSCODES_BACKEND_URL', '');
    vi.stubEnv('TRANSCODES_API_KEY', 'key');
    expect(() => loadConfig()).toThrow('TRANSCODES_BACKEND_URL is required');
  });

  it('throws when TRANSCODES_API_KEY is missing', () => {
    vi.stubEnv('TRANSCODES_BACKEND_URL', 'https://api.example.com');
    vi.stubEnv('TRANSCODES_API_KEY', '');
    expect(() => loadConfig()).toThrow('TRANSCODES_API_KEY is required');
  });

  it('throws on invalid URL', () => {
    vi.stubEnv('TRANSCODES_BACKEND_URL', 'not-a-url');
    vi.stubEnv('TRANSCODES_API_KEY', 'key');
    expect(() => loadConfig()).toThrow('not a valid URL');
  });

  it('strips trailing slash from backendUrl', () => {
    vi.stubEnv('TRANSCODES_BACKEND_URL', 'https://api.example.com/');
    vi.stubEnv('TRANSCODES_API_KEY', 'key');
    const config = loadConfig();
    expect(config.backendUrl).toBe('https://api.example.com');
  });

  it('apiBaseV1 = backendUrl + /v1', () => {
    stubValidEnv();
    const config = loadConfig();
    expect(config.apiBaseV1).toBe('https://api.example.com/v1');
  });

  it('sets projectId from TRANSCODES_PROJECT_ID', () => {
    stubValidEnv();
    vi.stubEnv('TRANSCODES_PROJECT_ID', 'proj-123');
    const config = loadConfig();
    expect(config.projectId).toBe('proj-123');
  });

  it('projectId is undefined when TRANSCODES_PROJECT_ID is empty', () => {
    stubValidEnv();
    vi.stubEnv('TRANSCODES_PROJECT_ID', '');
    const config = loadConfig();
    expect(config.projectId).toBeUndefined();
  });

  it('parses TRANSCODES_BACKEND_ENDPOINTS JSON into a Map', () => {
    stubValidEnv();
    vi.stubEnv(
      'TRANSCODES_BACKEND_ENDPOINTS',
      '{"get_project":"/project","list_members":"/members"}'
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

  it('endpointMap is undefined when TRANSCODES_BACKEND_ENDPOINTS is not set', () => {
    stubValidEnv();
    const config = loadConfig();
    expect(config.endpointMap).toBeUndefined();
  });
});
