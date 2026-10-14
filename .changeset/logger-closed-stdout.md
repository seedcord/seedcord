---
'@seedcord/logger': patch
---

Fixed a node bot crashing after its stdout closed, for example when you pipe its output into `head`, or spinning a CPU core if it had an `uncaughtException` handler. Console logs now stop once stdout closes, and the bot keeps running.
