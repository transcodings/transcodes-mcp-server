# @bigstrider/transcodes-mcp-server

An MCP server that lets AI assistants — Cursor, Claude Desktop, or any web IDE — interact with your [Transcodes](https://transcodes.io) account through natural language.

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
        "TRANSCODES_API_KEY": "tc_live_...",
        "TRANSCODES_PROJECT_ID": "your_project_id"
      }
    }
  }
}
```

> `TRANSCODES_PROJECT_ID` is optional, but without it the AI will ask for a project ID on every request.

---

## Web IDE access (Bolt.new, Lovable, etc.)

Set `NGROK_AUTHTOKEN` or `ZROK_TOKEN` in the env block. The server will open a public tunnel and print:

```
🚀 Transcodes MCP is ready!
   Paste this URL into your web IDE MCP settings:

   https://xxxx.ngrok.io/mcp
```

> **Security:** The tunnel URL has no built-in auth. Do not share it publicly.

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
