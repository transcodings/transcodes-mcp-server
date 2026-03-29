# CLAUDE.md

## Project Identity

`@bigstrider/transcodes-mcp-server`는 Transcodes 플랫폼의 **프론트엔드 클라이언트 SDK** npm 패키지입니다. 호스트 웹앱에서 WebAuthn 기반 인증(Passkey), RBAC IDP, 감사 로그(Audit), PWA 감지 등의 기능을 `window.transcodes` 글로벌 API를 통해 사용할 수 있도록 하는 래퍼 라이브러리입니다.

실제 SDK 구현체(Dynamic SDK)는 이 패키지에 포함되지 않으며, `init()` 호출 시 CDN(`d2xt92e3v27lcm.cloudfront.net`)에서 프로젝트별 `webworker.js`를 동적으로 로드합니다. 이 패키지는 타입 정의와 로더(script injection + polling)만 제공합니다.

## Commands

```bash
# 빌드 (Rollup → lib/index.cjs + lib/index.esm.js + lib/types/)
npm run build

# 릴리스 (빌드 + changeset publish)
npm run release-package
```

패키지 매니저는 **npm**입니다 (package-lock.json 사용).

## Architecture

```
src/
├── index.ts      # 진입점. 모든 public API 함수를 re-export
├── loader.ts     # 핵심 로직: init(), loadScript(), waitForTranscodes() + 각 API 래퍼 함수
├── types.ts      # 모든 TypeScript 인터페이스/타입 정의
└── constants.ts  # CDN_BASE URL 상수
```

- **loader.ts**: `init(projectId)` → CDN에서 `<script type="module">` 주입 → `window.transcodes` 폴링(50ms 간격, 10초 타임아웃) → Dynamic SDK의 `init()` 호출. 나머지 함수들(`getAccessToken`, `openAuthLoginModal` 등)은 모두 `client()` 헬퍼를 통해 `window.transcodes`에 위임하는 thin wrapper.
- **types.ts**: `TranscodesStaticAPI`(백엔드에서 빌드하는 Static SDK용)와 `TranscodesDynamicAPI`(런타임 초기화)가 `TranscodesBaseAPI`를 공유하는 구조. `transcodes.d.ts`(루트)는 이 타입의 auto-generated 복사본.
- **빌드 출력**: Rollup이 CJS + ESM 듀얼 포맷으로 번들링, TypeScript 선언 파일은 `lib/types/`에 생성.

## Versioning & Release Flow

Changesets를 사용한 자동 버전 관리:

1. `npx changeset` → 변경사항 기록
2. `main` 또는 `prerelease` 브랜치에 push → GitHub Actions가 "Version Packages" PR 자동 생성
3. PR 머지 시 `npm run release-package` 실행 → npm 배포

Pre-release: `npx changeset pre enter alpha|beta` 로 alpha/beta 모드 진입 가능.

## Code Conventions

- 코드 주석은 **한국어**로 작성
- `as` 타입 단언 사용 금지 (`as const`는 허용)
- 매직 스트링 대신 타입 안전한 상수 사용
