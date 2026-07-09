---
'@seedcord/logger': minor
---

The object and JSON sinks stamp `timestamp` from the record as ISO. The JSON sink read the format-time clock before, which could drift from the record's time.
