# @bigstrider/transcodes-mcp-server

An MCP server that lets AI assistants — Cursor, Claude Desktop, etc. — interact with your [Transcodes](https://transcodes.io) account through natural language.

Authentication uses a **single member MCP JWT** (`TRANSCODES_TOKEN`). The token carries `organizationId`, `projectId`, `memberId`, and must use audience `transcodes-mcp`. The server sends the token to the Transcodes API as the **`X-API-Key`** header.

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
        "TRANSCODES_BACKEND_URL": "https://api.transcodes.com",
        "TRANSCODES_TOKEN": "<member MCP JWT from the Transcodes console>",
        "TRANSCODES_BACKEND_ENDPOINTS": "{\"get_project\":\"/project\",\"get_member\":\"/auth/member\"}"
      }
    }
  }
}
```

All three env vars above are required. `TRANSCODES_BACKEND_ENDPOINTS` is a JSON map from MCP tool name to the API path after `/v1`. Only tools you list are exposed; extend the map with additional tool names and paths as needed for your deployment (do not paste a full catalog here — keep the map minimal).

### Token claims (expected shape)

The JWT payload should include at least:

- `iss` — e.g. `https://api.transcodes.com`
- `organizationId`, `projectId`, `memberId`
- `aud` — must include `transcodes-mcp`
- `jti`, `iat`, `exp` — standard JWT fields (`exp` must be in the future when the server starts)

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
