---
'@seedcord/core': minor
---

Every `CustomId` field now also takes `{ nullable: true }` and decodes to `T | null`, at one extra slot on the wire. Marking a live field nullable will change its layout hash as well.
