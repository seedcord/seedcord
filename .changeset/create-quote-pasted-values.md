---
'create-seedcord': patch
---

Fixed the commands `create-seedcord` prints at the end of a run, where a hex color like `#fe565a` or a folder with a space broke the paste in bash. A folder path with `$`, a backtick, a double quote, `!`, or `%` is now refused, because no quoting keeps those whole in every shell.
