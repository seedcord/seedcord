---
'seedcord': patch
---

`seedcord dev` and `seedcord build` now correctly resolve the `paths` a project declares in its tsconfig. The build also rewrites dynamic relative imports, which node rejected for having no extension.
