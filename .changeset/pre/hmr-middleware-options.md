---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** `HmrModuleHandler` now takes `handlers: { dir, is, register, unregister, getArtifacts }` and `middlewares: { dir, is, register, unregister }` instead of flat options like `handlersDir` and `isHandler`. Upgrade your plugins if you use this. Also bump official plugin versions that you're using.
