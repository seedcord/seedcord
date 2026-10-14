---
'@seedcord/logger': patch
---

Fixed a node bot with an `uncaughtException` handler spinning a CPU core after its stdout closed, for example when you pipe its output into `head`. Console logs now stop once stdout closes.
