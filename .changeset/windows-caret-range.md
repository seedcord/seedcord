---
'create-seedcord': patch
---

Fixed a new bot on Windows getting an exact `vite` version, because cmd removed the `^` from `vite@^8.3.4` during the install.
