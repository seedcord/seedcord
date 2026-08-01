---
'@seedcord/http': patch
---

`errors.logSilences` now turns off the per-`Silence` debug line on http, matching gateway. The field was read on gateway only.
