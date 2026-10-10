---
'@seedcord/http': minor
---

A node bot now reads its public key from Discord at startup when `DISCORD_PUBLIC_KEY` is unset. If that read fails, startup throws `ConfigPublicKeyUnavailable`.
