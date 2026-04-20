import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
// 대상 스크립트는 프로젝트 루트의 scripts/ 에 있음 (plain JS ESM).
// @ts-expect-error — .js 모듈에 타입 선언 파일 없음
import { verifyDist } from '../../scripts/verify-dist.js';

type VerifyResult =
  | { ok: true }
  | { ok: false; reason: string; detail: string };

/** 임시 dist 구조에 파일을 씀 (디렉토리 자동 생성). */
function writeFixture(root: string, relPath: string, content: string): void {
  const full = join(root, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

describe('verifyDist', () => {
  let tmpRoot: string;
  let distDir: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), 'verify-dist-'));
    distDir = join(tmpRoot, 'dist');
    mkdirSync(distDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('passes when both process.env references survive in a single *.js', () => {
    writeFixture(
      distDir,
      'config.js',
      `export function loadConfig(){
         const u = process.env.TRANSCODES_BACKEND_URL;
         const e = process.env.TRANSCODES_BACKEND_ENDPOINTS;
         return { u, e };
       }\n`
    );

    const result: VerifyResult = verifyDist(distDir);
    expect(result.ok).toBe(true);
  });

  it('passes when refs are split across multiple *.js files', () => {
    writeFixture(
      distDir,
      'url.js',
      'export const u = process.env.TRANSCODES_BACKEND_URL;\n'
    );
    writeFixture(
      distDir,
      'endpoints.js',
      'export const e = process.env.TRANSCODES_BACKEND_ENDPOINTS;\n'
    );

    const result: VerifyResult = verifyDist(distDir);
    expect(result.ok).toBe(true);
  });

  it('fails when TRANSCODES_BACKEND_URL reference is missing (substitution detected)', () => {
    // URL 은 리터럴로 대체되어 사라지고 ENDPOINTS 참조만 남은 경우
    writeFixture(
      distDir,
      'config.js',
      `const u = "https://transcodesapis.com";
       const e = process.env.TRANSCODES_BACKEND_ENDPOINTS;\n`
    );

    const result: VerifyResult = verifyDist(distDir);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('substitution_detected');
      expect(result.detail).toContain('process.env.TRANSCODES_BACKEND_URL');
    }
  });

  it('fails when both references are missing (full substitution)', () => {
    writeFixture(
      distDir,
      'config.js',
      `const u = "https://example.invalid";
       const e = '{"tool":"/path"}';\n`
    );

    const result: VerifyResult = verifyDist(distDir);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('substitution_detected');
    }
  });

  it('fails with dist_not_found when directory is missing', () => {
    const missing = join(tmpRoot, 'nonexistent-dist');
    const result: VerifyResult = verifyDist(missing);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('dist_not_found');
    }
  });

  it('fails with no_js_files when dist has no *.js', () => {
    writeFixture(distDir, 'README.md', '# just docs\n');

    const result: VerifyResult = verifyDist(distDir);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('no_js_files');
    }
  });
});
