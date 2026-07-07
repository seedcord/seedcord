---
'@seedcord/gateway': minor
'@seedcord/types': patch
'seedcord': patch
'@seedcord/plugins': patch
---

Decouple HMR from vite's `import.meta.hot` behind a typed `DevChannel`. Drop the `HmrModuleHandler` `name` option where you construct the handler, it was only an internal cache key and is no longer accepted.
