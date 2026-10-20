# READMEs

The READMEs are the first thing someone reads on GitHub and npm. They decide whether that person tries seedcord, and which package they install.

## Order

1. Read the cold reader's report on the current READMEs. It shows where a newcomer gets lost before you change anything.
2. Write the positioning set yourself: the root `README.md`, `packages/gateway`, `packages/http`, and `cli/seedcord`. Show the maintainer each one in the editor and change it with them until they commit it.
3. Send the rest to a helper session in batches, with the committed four as the reference. [PROMPTS.md](PROMPTS.md#readme-batches) has the job message.
4. Review each batch: read the diff, check every API in its samples against the code, then stage it.

Done when every published package's README and every private stub is committed.

## What a README carries

- What the package is for, and who installs it directly. A package that both transports already depend on says so in one line, and says when someone would install it alone.
- An install line that matches what `create-seedcord` installs (`cli/create-seedcord/src/scaffold/scaffold.ts`).
- One short sample built from real exports, with nothing from an `./internal` entry.
- Links to the guide for the rules.

Leave the rules, edge cases and option lists to the guide. A dense paragraph of config detail becomes one line and a link. Each cut fact goes into the guide notes file with the page it belongs on.

A library with no guide of its own, like `discord-component-embed`, keeps its long README. That README is its documentation.

## Positioning

- Lead with what seedcord is, then say what a transport is, and that seedcord builds both kinds of bot.
- Name the release's headline features plainly. On the Vite release, that meant any Vite plugin, `.env` modes, and the build targets: a server, one Bun binary, Cloudflare Workers, an npm package, and inside your own server.
- A feature list grouped under headings needs every group to look full. A two-item group reads as unfinished.
- End a feature list with a link to the guide, like "...and a lot more in the guide".
- Leave out anything the maintainer plans to break in the next release.

## Facts that held on the Vite release

Check each one again on later releases, since the code can change.

- seedcord loads `.env` files into envapt and never into `process.env`. A bot reads its own config through envapt too. Link envapt to `https://envapt.materwelon.dev`, and seedcord packages to npm.
- Every bot installs `@discordjs/builders` and `envapt`.
- On a Cloudflare Workers bot, attaching a server-only plugin like Mongoose or Kysely is a compile error.
- The pre-1.0 line reads "seedcord is pre-1.0, so a minor version can break your bot. Each release's changelog says what changed and how to update." Packages already past 1.0 leave it out.
- Link the reference as `seedcord.org/docs`.

## Verify before claiming

A claim a README makes, like "publish your bot to npm", gets tested end to end before it ships. On the Vite release, a helper session built a mock bot as a package, packed it, installed it in a fresh project, and started it against a fake Discord. That run is what made the claim safe to write.
