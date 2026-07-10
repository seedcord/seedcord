---
'@seedcord/logger': patch
'@seedcord/gateway': patch
---

The file sink opens on first write so repeated setup leaves no empty log files, evicted and reset sinks are disposed to close winston handles, and a log call with two Errors keeps both. The gateway loader flag resets when a bulk load throws. LoggerOptions is exported for typing the Logger constructor.
