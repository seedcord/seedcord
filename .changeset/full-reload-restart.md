---
'seedcord': patch
'@seedcord/core': patch
'@seedcord/types': patch
---

Fixed `seedcord dev` losing a handler with no error when you saved it after Vite reloaded every module, like after adding a new dependency. Dev now asks for a restart when that reload happens, and it warns when a saved file loses its last handler.
