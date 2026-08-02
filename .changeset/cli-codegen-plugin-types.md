---
'seedcord': minor
---

`seedcord codegen` writes the `Core` augmentation for every attached plugin, so `this.core.db` types with no hand-written `declare module`. It resolves each key off your bot's default export, which needs `moduleResolution: bundler`.
