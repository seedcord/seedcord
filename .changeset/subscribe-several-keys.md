---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

**BREAKING:** `@Subscribe` now takes one `[key, options?]` tuple per key, the same shape as `@RegisterEvent`. Change `@Subscribe('levelUp', { frequency: 'once' })` to `@Subscribe(['levelUp', { frequency: 'once' }])`. One subscriber can now list several keys and branch on the published one with `this.match`.
