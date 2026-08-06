---
'@seedcord/logger': patch
---

The logger now catches a sink that throws. Your logging call returns normally, the other sinks still get the record, and the broken sink is reported once on the console.
