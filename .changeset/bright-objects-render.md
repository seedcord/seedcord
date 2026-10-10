---
'@seedcord/logger': patch
---

Fixed pretty logging for object extras containing circular references or BigInt values. Circular references now appear as `[Circular]`, and BigInt values render as decimal digits.
