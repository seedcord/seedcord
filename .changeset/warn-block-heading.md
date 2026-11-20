---
'@seedcord/logger': patch
'@seedcord/core': patch
---

Fixed the heading color of a warning that `logger.utils.block()` logs. It used to be green like a success, and now it's amber for warning, or red for an error.
