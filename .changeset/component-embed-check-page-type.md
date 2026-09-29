---
'discord-component-embed': patch
---

Fixed `check` passing a page that Discord shows no preview for. Discord reads a page only when it's served as `text/html` or `application/xhtml+xml`.
