---
'@seedcord/logger': patch
---

Fixed `Logger.configure({ level: 'debug' })` on node swapping the winston console for the edge console sink, which printed each log as a multi-line object. A config without `sinks` now falls back to the node console.
