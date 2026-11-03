import { PRODUCTION_SITES } from '@seedcord/brand';

import { GUIDE_URL as GUIDE } from '#src/sites';

import type { Skill } from '#src/skills';

const DESCRIPTION =
    'Build a Discord bot with seedcord, a TypeScript framework for gateway and http bots, typed end to end. Covers picking a transport, declaring slash commands with generated option types, replying, components, gates, events, plugins, the CLI, and building for a server or Cloudflare Workers.';

export const SEARCH_RULE =
    'Before you write anything more than a plain reply, ask questions in the guide with `seedcord ask "<question>"`, or `pnpm dlx seedcord ask "<question>"` outside a project. `seedcord ask` also takes a pasted error or an error code like `3116`. The type-check and lint pass even when you hand-write something that seedcord already has.';

export const CODEGEN_RULE =
    '`seedcord codegen` writes the typed tables for slash commands, user and message context menus, emojis, and plugin keys. Run it after changing any of those.';

export const DEV_RULE = `To try a change against Discord, run \`seedcord dev\` in the background, ask the user to run the slash command, then read what \`seedcord dev\` logged. Without a terminal it logs JSON lines and takes commands on stdin, like \`{"do":"restart"}\`. ${GUIDE}/tooling/dev.md lists those commands.`;

const BODY = `---
name: seedcord
description: ${DESCRIPTION}
license: Apache-2.0
compatibility: TypeScript projects on Node 24.22.1+ (24.x), Node 26.12.1+, or Bun 1.4.2+.
metadata:
    documentation: ${GUIDE}
    reference: ${PRODUCTION_SITES.docs.url}
    llms_txt: ${GUIDE}/llms.txt
---

# Building a bot with seedcord

## 1. Read the rules

Fetch ${GUIDE}/llms.txt. It holds every rule that stops you inventing seedcord, and the index of every page.

## 2. Scaffold the project

Run \`pnpm create seedcord\`. It asks where the project goes, which transport, and your bot token. Then it installs, formats, runs codegen, and makes a git commit.

## 3. Write a command

A command file declares the command. A handler class replies to it. Read ${GUIDE}/commands.md, then the page for whatever else you are adding.

## 4. Run codegen

${CODEGEN_RULE}

## 5. Try it against Discord

${DEV_RULE}

## 6. Check every claim before you write it

${SEARCH_RULE}

Then fetch the page for the surface you are using. Every page answers at its own url plus \`.md\`, so ${GUIDE}/checks/gates.md is the Gates page.

## 7. Build for production

Read ${GUIDE}/build.md before you run \`seedcord build\`. It covers a node server and Cloudflare Workers.
`;

export const SEEDCORD_SKILL: Skill = { name: 'seedcord', description: DESCRIPTION, body: BODY };
