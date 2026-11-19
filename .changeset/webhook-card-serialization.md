---
'@seedcord/core': patch
---

Fixed `WebhookLog` logging discord.js's raw validation error when a card has a broken component. It now logs which component failed and why, the same as a reply does.
