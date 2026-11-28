---
'seedcord': patch
---

Fixed `seedcord dev` failing to start an edge bot that imports a file with `?url` or `?raw`, like `import styles from './styles.css?url'`.
