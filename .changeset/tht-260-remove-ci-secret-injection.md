---
'@bigstrider/transcodes-mcp-server': minor
---

Remove build-time CI secret substitution. Move baked-in defaults into `src/constants.ts`.

### What changed

- Dropped `release.yml`'s "Inject Secrets into All Source Files" step, which text-substituted `process.env.TRANSCODES_BACKEND_URL` and `process.env.TRANSCODES_BACKEND_ENDPOINTS` references in `src/**/*.ts` at build time. That step was the reason runtime env overrides were silently ignored in v1.3.0 (the identifiers got replaced with literals before `tsc` ran).
- Introduced `src/constants.ts` with `DEFAULT_BACKEND_URL` and `DEFAULT_ENDPOINT_MAP_JSON`. `loadConfig()` now falls back to these when the matching env var is unset, so `TRANSCODES_TOKEN` remains the only required env var for end users — exactly the DX of v1.3.0.
- Added `scripts/verify-dist.js` wired into `npm run release-package`. It fails the publish pipeline if `process.env.TRANSCODES_BACKEND_URL` / `process.env.TRANSCODES_BACKEND_ENDPOINTS` references are missing from `dist/*.js` — i.e. if CI-level substitution ever comes back.
- Added `src/__tests__/verify-dist.test.ts` covering the positive check, split references across files, missing dist, and missing `*.js`.
- Added a JSDoc warning block to `src/config.ts` documenting the invariant in-code.

### User impact

None for typical users. If your MCP client config sets only `TRANSCODES_TOKEN` (the v1.3.0 setup), v1.4.0 behaves identically. Overrides via `TRANSCODES_BACKEND_URL` or `TRANSCODES_BACKEND_ENDPOINTS` now take effect (they were silently ignored in v1.3.0).

Ref: THT-260
