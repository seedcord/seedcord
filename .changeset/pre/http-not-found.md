---
'@seedcord/http': minor
---

**BREAKING:** An http bot now answers anything besides a POST with a 404 unless a plugin answers it first. It used to answer 405, so update any uptime check that expects a 405 from your interactions URL.
