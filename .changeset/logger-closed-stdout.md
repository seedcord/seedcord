---
'@seedcord/logger': patch
---

Fixed a node bot keeping a CPU core busy and never exiting after its stdout closed, for example when you pipe its output into `head`. Console logs now stop once stdout closes, and the bot keeps running.
