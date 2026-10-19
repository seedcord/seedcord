---
'seedcord': patch
---

Fixed `seedcord codegen`, `build` and `commands` picking up a command class from a dot-folder or `node_modules` inside the commands folder. The bot itself never loads those files.
