---
'@seedcord/core': patch
---

Fixed a plugin's constructor logging on the `default` channel. Those lines now use its attach key as their channel, like every other log line from the plugin.
