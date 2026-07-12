---
'@seedcord/http': minor
---

New `@seedcord/http` package, the HTTP-interactions receiver. `createSeedcord()` returns a `(request: Request) => Promise<Response>` handler that verifies the Ed25519 signature over the raw request bytes (WebCrypto, no `node:crypto`), rejects timestamps more than five minutes from the receiver clock and exact replays of an accepted signature with 401, answers a PING with an in-body PONG, and acks every other interaction with an empty 202. Dispatch to handlers is unbuilt. A verified interaction is logged and dropped after the ack. The public key is read from `DISCORD_PUBLIC_KEY` through envapt, missing or malformed values throw at construction.
