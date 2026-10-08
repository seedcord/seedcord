---
'@seedcord/http': patch
---

Fixed the node http server's shutdown waiting 5s and failing with `stop-http-server` timed out when a client kept its connection open. The server now closes that connection once it sends the response the client was waiting on.
