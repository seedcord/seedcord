---
'seedcord': minor
---

`seedcord build` and `seedcord dev` now throw `CliEdgeOnBun` for an edge bot on Bun, since Cloudflare's config loader throws there. Run the CLI on Node, which `bun run dev` does.
