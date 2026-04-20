#!/usr/bin/env node
// @ts-check
/**
 * verify-dist — CI 치환 회귀 방지 가드 (THT-260).
 *
 * 배경: v1.x 시절 `.github/workflows/release.yml` 은 빌드 전에 소스 코드의
 * `process.env.TRANSCODES_*` 참조를 GitHub secret 의 리터럴 값으로 치환했음.
 * 결과적으로 배포된 dist 가 런타임 env override 를 무시했고, 프로덕션 URL /
 * 엔드포인트 맵이 tarball 에 박혀있었음.
 *
 * 이 가드는 CI 치환이 다시 도입되는 회귀를 차단함:
 *   dist/*.js 안에 `process.env.TRANSCODES_BACKEND_URL` 과
 *   `process.env.TRANSCODES_BACKEND_ENDPOINTS` 참조가 반드시 유지되어 있어야 함.
 *   (치환이 일어났다면 이 식별자가 리터럴 문자열로 대체되어 사라짐)
 *
 * `src/constants.ts` 에 명시적으로 커밋된 기본값은 정상 dist 출력이므로
 * 이 가드는 그 상수 리터럴을 검사하지 않음. 별도 도메인 blocklist 는 없음.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REQUIRED_SOURCE_REFS = [
  'process.env.TRANSCODES_BACKEND_URL',
  'process.env.TRANSCODES_BACKEND_ENDPOINTS',
];

/**
 * @typedef {{ok: true} | {ok: false, reason: string, detail: string}} VerifyResult
 */

/** dist 디렉토리를 재귀 walk → 파일 경로 목록 */
function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

/**
 * dist/*.js 에 process.env 참조가 유지되는지 검증.
 * @param {string} distDir
 * @returns {VerifyResult}
 */
export function verifyDist(distDir) {
  try {
    if (!statSync(distDir).isDirectory()) {
      return {
        ok: false,
        reason: 'dist_not_found',
        detail: `${distDir} is not a directory`,
      };
    }
  } catch {
    return {
      ok: false,
      reason: 'dist_not_found',
      detail: `${distDir} not found. Run \`npm run build\` first.`,
    };
  }

  const files = walk(distDir);
  const jsFiles = files.filter((f) => f.endsWith('.js'));
  if (jsFiles.length === 0) {
    return {
      ok: false,
      reason: 'no_js_files',
      detail: 'dist contains no *.js files (build did not produce output?)',
    };
  }

  /** @type {Set<string>} */
  const foundRefs = new Set();
  for (const jsPath of jsFiles) {
    const content = readFileSync(jsPath, 'utf8');
    for (const ref of REQUIRED_SOURCE_REFS) {
      if (content.includes(ref)) foundRefs.add(ref);
    }
  }
  for (const ref of REQUIRED_SOURCE_REFS) {
    if (!foundRefs.has(ref)) {
      return {
        ok: false,
        reason: 'substitution_detected',
        detail: `Required source reference '${ref}' not found in any dist/*.js. CI may be substituting process.env references at build time (THT-260 regression).`,
      };
    }
  }

  return { ok: true };
}

// CLI entry point — script 직접 실행 시에만 동작
const scriptPath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1]
  ? fileURLToPath(pathToFileURL(process.argv[1]))
  : '';
if (scriptPath === invokedPath) {
  const distDir = process.argv[2] || 'dist';
  const result = verifyDist(distDir);
  if (result.ok) {
    console.log(
      `✓ verify-dist: ${distDir} keeps process.env.TRANSCODES_* references intact`
    );
    process.exit(0);
  } else {
    console.error(`✗ verify-dist FAILED [${result.reason}]: ${result.detail}`);
    process.exit(1);
  }
}
