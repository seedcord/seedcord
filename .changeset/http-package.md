---
'@seedcord/http': minor
---

New `@seedcord/http`, an HTTP-interactions receiver for a node server or an edge worker (edge worker build is WIP).

`new Seedcord(config).start(port)` runs a node host with handler discovery, dev HMR, a health server, coordinated shutdown, and plugin `attach`. Edge builds import `createSeedcord` from `@seedcord/http/edge`, which verifies the Ed25519 signature over the raw bytes, rejects stale and replayed requests, and dispatches through a generated route manifest.

Handlers carry the same reply surface, gates, typed options, customId decoding, emoji and command accessors, and pagination as gateway.
