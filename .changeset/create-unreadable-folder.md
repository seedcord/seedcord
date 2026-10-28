---
'create-seedcord': patch
---

Fixed `--dir` pointing at a folder create-seedcord can't read failing with node's raw error. It now fails as a `--dir` answer that asks for another folder.
