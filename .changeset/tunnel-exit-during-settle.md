---
'seedcord': patch
---

Fixed dev not reporting a cloudflared exit during the wait after it printed the hostname, which left dev registering an address that no longer answers.
