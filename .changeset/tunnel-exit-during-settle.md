---
'seedcord': patch
'@seedcord/errors': patch
---

Fixed dev registering a quick tunnel address after cloudflared exited during the wait before the URL answered. The startup attempt now fails with `CliTunnelExited` instead.
