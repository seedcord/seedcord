---
'@seedcord/logger': patch
---

Fixed the extra values in a log call showing in only one of your sinks. With the console and a file sink both on, `logger.info('saved', id, name)` printed `id` and `name` in the first sink to format the line and left them out of the second.
