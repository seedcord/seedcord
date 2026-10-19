---
'@seedcord/core': patch
---

Fixed `seedcord dev` asking to redeploy commands after a save in a dot-folder or `node_modules` inside the commands folder. The bot never loads those files.
