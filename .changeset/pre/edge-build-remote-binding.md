---
'seedcord': patch
---

Fixed `seedcord build` never exiting on an edge bot with a remote binding, and failing without a Cloudflare login. The boot check now runs the worker without connecting to Cloudflare.
