---
'@seedcord/plugin-mongoose': minor
---

**BREAKING:** `@RegisterMongooseModel` is removed. Declare the schema as a plain `public static schema` member and a class without one is a compile error. The model name comes from the service key, with a `modelName` option on `@RegisterMongooseService` to override it.

The plugin builds the model after the connection opens.
