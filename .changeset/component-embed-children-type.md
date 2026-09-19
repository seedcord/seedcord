---
'discord-component-embed': minor
---

**BREAKING:** If your own component passes its `children` into one of these components, type that prop as `EmbedNode`. `ReactNode` and Preact's `ComponentChildren` no longer fit.
