---
'seedcord': patch
---

A previous change to make interaction handler routing decorators be very strict with types made it so that you couldn't use more than one on a single InteractionHandler anymore, which was a previous behavior that worked. This change now infers the types provided to the generic of InteractionHandler, extracts the type of the class, and compares it to the types expected by each decorator being used. It'll also tell you which one is missing in case of a mismatch.
