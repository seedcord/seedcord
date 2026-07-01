---
'seedcord': patch
---

Register the subscriber bus for HMR so editing a subscriber file hot-reloads it in dev. The wiring existed but was never invoked, so subscriber edits silently needed a full restart.
