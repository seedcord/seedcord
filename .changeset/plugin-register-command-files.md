---
'@seedcord/core': minor
---

Added `registerCommandFiles` to `Plugin`. It takes glob patterns, and under `seedcord dev`, saving a file they match shows the refresh prompt. If a pattern starts with `!`, saving a file that it matches doesn't show the prompt.
