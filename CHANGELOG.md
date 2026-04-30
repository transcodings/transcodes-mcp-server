# @bigstrider/transcodes-mcp-server

## 1.4.3

### Patch Changes

- 63e1982: fixed security errors

## 1.4.2

### Patch Changes

- 7279d9c: removed anyOf syntax from member tool

## 1.4.1

### Patch Changes

- 7bc1fcc: added required params

## 1.4.0

### Minor Changes

- d785651: Remove build-time CI secret substitution. Move baked-in defaults into `src/constants.ts`. Drop `TRANSCODES_BACKEND_ENDPOINTS` env support.

  ### What changed

  - Dropped `release.yml`'s "Inject Secrets into All Source Files" step, which text-substituted `process.env.TRANSCODES_BACKEND_URL` and `process.env.TRANSCODES_BACKEND_ENDPOINTS` references in `src/**/*.ts` at build time. That step was the reason runtime env overrides were silently ignored in v1.3.0 (the identifiers got replaced with literals before `tsc` ran).
  - Introduced `src/constants.ts` with `DEFAULT_BACKEND_URL` and `DEFAULT_ENDPOINT_MAP`. `loadConfig()` falls back to `DEFAULT_BACKEND_URL` when `TRANSCODES_BACKEND_URL` is unset; the tool catalog is always built from `DEFAULT_ENDPOINT_MAP`.
  - Removed `TRANSCODES_BACKEND_ENDPOINTS` env support entirely. The tool name → API path map is a library-internal contract and is not configurable at runtime.
  - Added `scripts/verify-dist.js` wired into `npm run release-package`. It fails the publish pipeline if `process.env.TRANSCODES_BACKEND_URL` is missing from `dist/*.js` — i.e. if CI-level substitution ever comes back.
  - Added `src/__tests__/verify-dist.test.ts` covering the positive check, split references across files, substitution detection, missing dist, and missing `*.js`.
  - Added a JSDoc warning block to `src/config.ts` documenting the invariant in-code.

  ### User impact

  None for typical users. If your MCP client config sets only `TRANSCODES_TOKEN` (the v1.3.0 setup), v1.4.0 behaves identically. Users who were setting `TRANSCODES_BACKEND_ENDPOINTS` in v1.3.0 were already having it silently overridden by the baked-in default, so removing the env is a no-op for existing behavior. `TRANSCODES_BACKEND_URL` override now actually takes effect (was silently ignored in v1.3.0).

  Ref: THT-260

### Patch Changes

- dfe527e: merged env variables param list and fixed minor env variables
- c8034b5: corrected comments

## 1.3.0

### Minor Changes

- 74c7de3: refactored api key -> token

## 1.2.1

### Patch Changes

- 0e82bcc: fixed env variables

## 1.2.0

### Minor Changes

- 643e73a: fixed env variables import
- 40982dd: removed proxy server

## 1.1.0

### Minor Changes

- 82a6f11: enabled member revokation

### Patch Changes

- 2679941: fixed env variable issues

## 1.0.1

### Patch Changes

- 09df3ef: changed env variables location

## 1.0.0

### Major Changes

- MCP server for the Transcodes platform that connects with Transcodes API Server
