---
'@seedcord/gateway': patch
'@seedcord/http': patch
---

Both transports now log every fault line on the `errors` channel as `Faults`. http used to log them on `interactions` as `Dispatcher`, and gateway labelled some of them `ErrorsHandling`.
