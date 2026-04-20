# @bigstrider/transcodes-mcp-server

An MCP server that lets AI assistants — Cursor, Claude Desktop, etc. — interact with your [Transcodes](https://transcodes.io) account through natural language.

Authentication uses a **single member MCP JWT** (`TRANSCODES_TOKEN`). The token carries `organizationId`, `projectId`, `memberId`, and must use audience `transcodes-mcp`. The server sends the token to the Transcodes API as the **`x-transcodes-token`** header.

---

## Node.js version

This package requires **Node.js 20+** (same as `@modelcontextprotocol/sdk`). MCP clients often invoke the first `node` on your `PATH`. If you use nvm and an old default (e.g. 16) is first, you will see cryptic `@hono/node-server` / `Request` errors — fix by pointing `command` at a Node 20+ binary or adjusting your default Node.

---

## Setup

**Cursor** → `~/.cursor/mcp.json`  
**Claude Desktop** → `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "transcodes": {
      "command": "npx",
      "args": ["@bigstrider/transcodes-mcp-server"],
      "env": {
        "TRANSCODES_TOKEN": "<member MCP JWT from the Transcodes console>"
      }
    }
  }
}
```

Only `TRANSCODES_TOKEN` is required. The server points at the Transcodes production API and exposes the full tool catalog by default — see `src/constants.ts` for the baked-in `DEFAULT_BACKEND_URL` and `DEFAULT_ENDPOINT_MAP_JSON`. Override them via env when running against a local backend or restricting the tool surface:

```json
"env": {
  "TRANSCODES_TOKEN": "<member MCP JWT>",
  "TRANSCODES_BACKEND_URL": "http://localhost:3500",
  "TRANSCODES_BACKEND_ENDPOINTS": "{\"get_project\":\"/project\"}"
}
```

`TRANSCODES_BACKEND_ENDPOINTS` is a JSON map from MCP tool name to the API path after `/v1`. When set, it **replaces** the default catalog — only tools you list are exposed.

### Token claims (expected shape)

The JWT payload should include at least:

- `iss` — e.g. `https://api.transcodes.com`
- `oid`, `pid`, `mid` — organization / project / member ids (the parser only reads these short claim names)
- `aud` — must include `transcodes-mcp`
- `jti`, `iat`, `exp` — standard JWT fields (`exp` must be in the future when the server starts)

---

## Upgrading to v1.4.0

**No config changes required** for most users. If your MCP client config sets only `TRANSCODES_TOKEN` (the typical v1.3.0 setup), v1.4.0 behaves identically by default — the production backend URL and tool catalog moved from build-time CI substitution into `src/constants.ts` as explicit defaults.

What changed:
- **Runtime env overrides now actually work.** In v1.3.0, setting `TRANSCODES_BACKEND_URL` or `TRANSCODES_BACKEND_ENDPOINTS` in your client config was silently ignored because those identifiers had been replaced with literals at build time. v1.4.0 removes the substitution step, so overrides take effect. Useful for pointing at a local backend in dev (`TRANSCODES_BACKEND_URL=http://localhost:3500`) or restricting the tool surface.
- **`TRANSCODES_TOKEN` stays required.** Missing token still throws at startup. Nothing else is required.

### Coming from v1.2.1 or older?

v1.2.1 used `TRANSCODES_API_KEY` + `TRANSCODES_PROJECT_ID`, which were replaced by a member MCP JWT in v1.3.0 (before this release). If you skipped that upgrade:

1. Issue a member MCP JWT (Transcodes console → Members → Generate MCP token).
2. Replace the two old env vars with `TRANSCODES_TOKEN` (the JWT carries `organizationId` / `projectId` / `memberId` as claims, so no separate project id env is needed).
3. Restart your MCP client.

---

## What the AI can do

| Category          |                                                              |
| ----------------- | ------------------------------------------------------------ |
| Projects          | Fetch project details, domain URL, toolkit config            |
| Members           | Look up, create, update members; paginated listing           |
| Auth devices      | List passkeys, authenticators, TOTP devices per member       |
| Roles & RBAC      | Create/update roles, set permissions, simulate access checks |
| Audit logs        | Query security logs with date and tag filters                |
| Membership        | List plans and limits, generate Stripe checkout link         |
| Integration guide | Fetch the official Transcodes guide for code generation      |
| Generic HTTP      | Call any `/v1/...` endpoint directly                         |

Actions that must happen in the browser (passkey/TOTP enroll or delete, JWK backup) return a direct console link: `{your-domain}?tc_mode=console`.

---

## Requirements

- Node.js ≥ 20

---

## License

MIT
