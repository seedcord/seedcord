---
'@seedcord/gateway': patch
'@seedcord/http': patch
---

Fixed an autocomplete handler that throws a `Silence` or an ignored API code leaving Discord without a response. seedcord now sends empty choices on every autocomplete fault.
