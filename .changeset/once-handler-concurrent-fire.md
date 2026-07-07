---
'@seedcord/gateway': patch
---

Fix a `once` event handler running twice when the same event fired concurrently. Two overlapping fires both passed the spent-handler check before either marked it spent.
