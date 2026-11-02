---
'@seedcord/http': patch
---

http now logs every fault line on the `errors` channel as `Faults`, the same as gateway. It used to log them on `interactions` as `Dispatcher`.
