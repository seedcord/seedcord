---
'@seedcord/core': patch
---

Fixed the unclear `Cannot read properties of undefined (reading 'setChannel')` error when attaching a plugin built on a different copy of `@seedcord/core`. It now throws `CorePluginFromOtherCore` before the plugin is constructed.
