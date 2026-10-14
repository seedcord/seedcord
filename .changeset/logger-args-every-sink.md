---
'@seedcord/logger': patch
---

Fixed the extra values in a log call showing in only one of your sinks. With the console and a file sink both on, `logger.info('saved', id)` printed `id` in the first sink to format the line and left it out of the second.
