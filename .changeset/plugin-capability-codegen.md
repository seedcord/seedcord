---
'seedcord': minor
---

`seedcord codegen` now writes the `Core` augmentation for every attached plugin, so `this.core.db` types without a hand-written `declare module` block. A bot with no plugins emits nothing new.

The generated file imports your bot's default export and resolves each key off it, which needs `moduleResolution: bundler`.
