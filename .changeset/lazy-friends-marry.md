---
'@seedcord/services': patch
'@seedcord/types': patch
'@seedcord/utils': minor
---

new function called filterCirculars that cleans up objects with circular refs
new ILogger interface defining logging methods for various log levels so packages that would normally have a circular dependency on services can just depend on types instead
