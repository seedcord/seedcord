---
'@seedcord/core': patch
---

A bot now starts on Deno with a warning that seedcord isn't tested there. It used to throw because it compared the Node version that Deno reports against the Node requirement.
