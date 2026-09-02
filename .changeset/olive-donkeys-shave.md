---
'@seedcord/errors': patch
---

Two codes for a customId that fails to decode. `CustomIdWireStale` fires when the wire predates a shape change, and `CustomIdWireInvalid` when it is corrupt or came from a different definition.
