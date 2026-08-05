---
'@seedcord/errors': patch
'@seedcord/types': patch
'seedcord': minor
---

`seedcord dev` exposes an http bot's interactions server through the `tunnel` dev config field. `true` opens a cloudflared quick tunnel and writes the interactions endpoint on every run. An https URL is one you already serve, and the CLI checks it reaches the bot, writes the endpoint when the stored value differs, then leaves it in place.
