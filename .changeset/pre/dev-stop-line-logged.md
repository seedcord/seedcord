---
'seedcord': patch
---

Fixed `seedcord dev` without a terminal ending on a raw `dev stopped` line. That line is now a log record, so it's JSON without a terminal and has the usual log prefix in one.
