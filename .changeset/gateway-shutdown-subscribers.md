---
'@seedcord/gateway': patch
---

Fixed a gateway bot shutting down while a bus subscriber or a log sink was still running after its handler returned. A graceful shutdown now waits for them, up to the drain window.
