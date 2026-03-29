---
paths:
  - "src/types.ts"
  - "transcodes.d.ts"
---

# Type Definitions & Declaration File

## Single Source of Truth

`src/types.ts` is the canonical type definition file. `transcodes.d.ts` (root) is a copy for consumers who need global type augmentation without importing the package.

When modifying types:
1. Edit `src/types.ts` first
2. Ensure `transcodes.d.ts` reflects the same changes
3. These two files must stay in sync — never edit only one

## Type Hierarchy

```
TranscodesBaseAPI          ← shared interface (token, user, modals, events, audit, PWA)
├── TranscodesStaticAPI    ← backend-built Static SDK (adds showMessage)
└── TranscodesDynamicAPI   ← runtime-initialized Dynamic SDK (adds init, setConfig, isInitialized)
```

`TranscodesAPI = TranscodesStaticAPI | TranscodesDynamicAPI` — the union type for `window.transcodes`.

## Global Augmentation

`types.ts` augments the global `Window` interface. The `declare global` block defines:
- `Window.transcodes: TranscodesAPI`
- `Navigator.getInstalledRelatedApps` (PWA detection)
- `BeforeInstallPromptEvent` (PWA install prompt)
