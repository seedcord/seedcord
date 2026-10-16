---
'seedcord': minor
---

The CLI now throws `CliEdgeOnBun` when it loads an edge bot on Bun, since Cloudflare's config loader throws there. Run the CLI on Node, which `bun run dev` does.
