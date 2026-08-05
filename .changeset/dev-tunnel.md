---
'@seedcord/errors': patch
'@seedcord/types': patch
'seedcord': minor
---

`seedcord dev` opens a cloudflared tunnel for an http bot and sets the Discord application's interactions endpoint to the tunnel URL. Set `tunnel: false` in the dev config to turn it off.
