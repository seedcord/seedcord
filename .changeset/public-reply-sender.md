---
'@seedcord/core': minor
'@seedcord/gateway': minor
'@seedcord/http': minor
---

Every repliable handler now carries its reply sender on a public `sender` property, replacing the internal `getSender()`. `ReplySender`, `BaseReplySender`, and `ModalLike` are also exported now.
