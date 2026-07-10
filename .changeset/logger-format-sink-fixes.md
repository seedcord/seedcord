---
'@seedcord/logger': patch
---

Render each format-specifier arg once. Build the node default sinks only when the config's `sinks` field is absent, so a supplied sink array avoids their construction side effects.
