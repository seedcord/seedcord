---
'seedcord': patch
---

Fixed `seedcord dev` on an edge bot logging a `SyntaxError` about invalid JSON when a module failed to load with an error that points back at itself. It now logs the original error, like the message a Vite plugin threw.
