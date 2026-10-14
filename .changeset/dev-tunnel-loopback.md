---
'seedcord': patch
---

Fixed `seedcord dev` sending an http bot's tunnel traffic to another program on the same port. With the default quick tunnel, the bot now listens on `127.0.0.1` only.
