---
'@seedcord/logger': patch
---

Render each format-specifier arg once. Build the node default sinks only when a bot omits its own, so a supplied sink array avoids their construction side effects.
