---
'seedcord': patch
---

Fixed `seedcord dev` answering 404 for every file on an edge bot, like a `public` file or a dashboard page. Vite now serves anything outside your bot's `root` folder (nobody can download the files inside it, though).
