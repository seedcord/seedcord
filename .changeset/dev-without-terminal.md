---
'seedcord': patch
---

Fixed `seedcord dev` crashing with "Raw mode is not supported" when stdin isn't a terminal. Without a terminal, or with `CI` set to any value, it now prints plain log lines and answers its own prompts.
