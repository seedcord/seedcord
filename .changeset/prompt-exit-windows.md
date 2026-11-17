---
'create-seedcord': patch
'seedcord': patch
---

Fixed `create-seedcord`, `seedcord make`, and `seedcord commands` waiting for Enter before they exit on Windows. The prompts turned the terminal's raw mode off while stdin was still reading, which left a console read open until the next keypress.
