---
'seedcord': patch
---

Fixed `seedcord dev` answering 404 for a stylesheet, image, font or other asset that an edge bot imports with `?url` from inside its `root` folder, like `import styles from './styles.css?url'`.
