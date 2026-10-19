---
'@seedcord/core': patch
---

Fixed a bot bundled by Next.js throwing `CoreDuplicateName` at startup, because the minifier gave two middleware classes the same name. Two middleware classes that share a name now both run.
