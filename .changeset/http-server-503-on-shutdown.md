---
'@seedcord/http': patch
---

Fixed the node http server running the handler for a request that was still arriving when shutdown began. It now answers that request with 503.
