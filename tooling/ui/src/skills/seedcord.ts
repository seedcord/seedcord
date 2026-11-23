import { PRODUCTION_SITES, stageNotice } from '@seedcord/brand';

import { GUIDE_URL as GUIDE, REPO_URL } from '#src/sites';

import type { Skill } from '#src/skills';

const DESCRIPTION =
    'Build, change, or port a Discord bot with seedcord, a TypeScript framework that is newer than your training data. Use when a project imports `@seedcord/gateway` or `@seedcord/http`, when starting a new Discord bot, or when porting a discord.js bot.';

/** What an agent has to follow on every change. The skill and every `llms.txt` list these. */
export const RULES = [
    "seedcord isn't in training data. Read a page before you write code against it.",
    'The type-check and lint pass even when you hand-write something that seedcord already has. Before you write anything more than a plain reply, like a helper, a component, a timer, a store, or a workaround, run `seedcord ask "<what you need>"`, or `pnpm dlx seedcord ask "<what you need>"` outside a project. `seedcord ask` also takes a pasted error or an error code like `3116`.',
    "`seedcord` on npm is the command line tool. A bot installs `@seedcord/gateway` for a websocket connection, or `@seedcord/http` to answer Discord's interactions endpoint. It installs one of the two. Before you install another seedcord package, check whether that one already exports what you need since the transports re-export most packages.",
    'Read the current version of every package from the npm registry. Each one has its own version number.',
    `${stageNotice('your bot')} Read that changelog before you bump a seedcord package.`,
    'A command is declared in one file and answered in another, by a handler class carrying a route decorator. seedcord reads those decorators at startup and dispatches every interaction itself.',
    '`seedcord codegen` writes the typed tables for slash commands, user and message context menus, emojis, and plugin keys. Run it after changing any of those.',
    `When a change is ready to try against Discord, run \`seedcord dev\` in the background without waiting to be asked, and keep its stdin open so you can send it commands. Ask the user to run the slash command, then read what \`seedcord dev\` logged, including any warnings. Without a terminal it logs JSON lines and takes commands on stdin, like \`{"do":"restart"}\`. ${GUIDE}/tooling/dev.md lists those commands.`,
    `Never import from a seedcord path ending in \`/internal\`, like \`@seedcord/core/internal\`. Those paths wire seedcord's own packages together and change without notice. If the only way to do something is through one, tell the user so they can open an issue at ${REPO_URL}/issues.`
];

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

# seedcord

## Rules for every change

${RULES.map((rule) => `- ${rule}`).join('\n')}

A change is done when the type-check and lint pass, and \`seedcord dev\` logged the command running without a warning.

## Reading the docs

Every guide page answers at its own url plus \`.md\`, so ${GUIDE}/checks/gates.md is the Gates page. ${GUIDE}/llms.txt lists every page. The API reference is at ${PRODUCTION_SITES.docs.url}, one page per symbol.

## Starting a new bot

1. Run \`pnpm create seedcord --help\`, then scaffold the bot with every flag set. Every question that the interview asks has a flag, so passing them all skips the interview. By default it then installs, formats, runs codegen, and makes a git commit.
2. Read the AGENTS.md that it writes.
3. Read ${GUIDE}/commands.md, then write the first command.
4. Read ${GUIDE}/build.md before you run \`seedcord build\`. It covers a node server and Cloudflare Workers.

## Porting a discord.js bot

1. Read ${GUIDE}/coming-from-discordjs.md. It lists what replaces each discord.js pattern, how to add seedcord to an existing repo, and what breaks after the move.
2. Copy the rules above into the repo's AGENTS.md because later sessions load that file.
`;

export const SEEDCORD_SKILL: Skill = { name: 'seedcord', description: DESCRIPTION, body: BODY };
