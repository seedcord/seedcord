---
'seedcord': minor
---

**BREAKING:** `seedcord build` and `seedcord dev` now check an edge bot with a probe header that the bot answers before it starts, so the check never logs it in to Discord. Update `@seedcord/http` and `seedcord` together on an edge bot because an older bot doesn't answer the probe.
