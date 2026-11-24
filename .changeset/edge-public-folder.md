---
'seedcord': patch
---

Fixed `seedcord build` not shipping an edge bot's `public` folder. Files in it now ship as Workers static assets, so `public/logo.png` shows up at `/logo.png`.
