---
'@seedcord/gateway': patch
---

`ModalHandler` carries `update` and `deferUpdate` guards, matching http. A modal opened from a command reports the missing source message before the ack state, and the failed write no longer publishes `responseAttempted`.
