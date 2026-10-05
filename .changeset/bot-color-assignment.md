---
'@seedcord/core': patch
'@seedcord/gateway': patch
'@seedcord/http': patch
---

Fixed `seedcord.config.botColor` having no effect when you assign it after `new Seedcord()`. If you load the color after startup, like from a settings file, every embed and container you send after that will use it.
