---
'seedcord': minor
---

- **BREAKING**: removed `buildCustomId` from the component builders. Encode a customId with the `CustomId` chain instead, `new CustomId('approve').snowflake('userId').encode({ userId })`, which the typed component handlers decode back through `this.params`.
