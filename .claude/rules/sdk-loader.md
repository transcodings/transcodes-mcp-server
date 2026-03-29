---
paths:
  - "src/loader.ts"
---

# SDK Loader Patterns

## Init & Promise Memoization

- `initPromise` is the module-level singleton that memoizes `init()` calls. It must:
  - Return the existing promise on subsequent calls (idempotent)
  - Reset to `null` on failure (allows retries)
  - Never be exported directly — consumers use `whenReady()` or `isInitialized()`

## API Wrapper Rules

Two categories of exported functions — do not mix patterns:

### Async wrappers (use `whenReady()`)
Functions that return Promises must `await whenReady()` before accessing the SDK:
```typescript
export const getAccessToken = async (): Promise<string | null> =>
  (await whenReady()).token.getAccessToken();
```
This ensures the function waits for init to complete rather than throwing.

### Sync wrappers (use `client()`)
Functions that must remain synchronous use `client()` which throws if SDK not initialized:
- `hasToken()` — returns `boolean`, cannot be made async without breaking API
- `isPwaInstalled()` — returns `boolean`
- `on()` / `off()` — event subscription, returns unsubscribe function

Never convert a sync wrapper to async — it changes the public API contract.

## Adding New API Functions

1. Add the method signature to the appropriate interface in `types.ts` (`TranscodesBaseAPI`, `TokenAPI`, etc.)
2. Add the wrapper function in `loader.ts` following the correct pattern (async or sync)
3. The function is automatically exported via `index.ts` (`export * from './loader'`)
4. Update `transcodes.d.ts` to match the new types
