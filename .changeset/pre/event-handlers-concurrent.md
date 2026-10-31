---
'@seedcord/gateway': minor
---

**BREAKING:** The handlers registered on one event now run at the same time. If one handler reads something another handler writes on the same event, it can now get the old value, for example a rank-role handler reading the XP a leveling handler adds. Move steps that depend on each other into one handler.
