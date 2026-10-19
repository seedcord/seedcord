---
'@seedcord/core': patch
---

Fixed `seedcord dev` hot reloading a handler saved in a dot-folder or `node_modules` inside the handlers folder. The bot never loads those files at startup.
