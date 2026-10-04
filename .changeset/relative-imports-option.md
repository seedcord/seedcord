---
'@seedcord/eslint-config': minor
---

Added `relativeImports: 'parent'` to report an import like `'../utils/format'`. A path alias like `#src/utils/format` and a `./` import still pass.
