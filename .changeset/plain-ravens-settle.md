---
'create-seedcord': patch
---

Fixed the scaffold reading a skipped build script as an install failure. pnpm exits non-zero there with every package already installed.
