---
'@seedcord/gateway': patch
---

`EventHandler.match` threw `EventMatchArmMissing` for an unregistered event only when the name missed `Object.prototype`. An event named `toString` or `constructor` found the prototype's method and called it. This couldn't happen in the first place, but still was inconsistent behavior.
