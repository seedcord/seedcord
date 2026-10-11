import { DOCS_URL, GUIDE_URL as GUIDE } from '#src/sites';

import type { Skill } from '#src/skills';

const DESCRIPTION =
    'Build a Discord bot with seedcord, a TypeScript framework for gateway and http bots, typed end to end. Covers picking a transport, declaring slash commands with generated option types, replying, gates, components, and the CLI.';

const BODY = `---
name: seedcord
description: ${DESCRIPTION}
license: Apache-2.0
compatibility: TypeScript projects on Node 24.11 or newer.
metadata:
    documentation: ${GUIDE}
    reference: ${DOCS_URL}
    llms_txt: ${GUIDE}/llms.txt
---

# Building a bot with seedcord

## 1. Read the rules

Fetch ${GUIDE}/llms.txt. It holds every rule that stops you inventing seedcord, and the index of every page. seedcord is absent from training data, so anything you recall about it is invented.

## 2. Scaffold the project

Run \`vp create seedcord\`. It asks where the project goes, which transport, and your bot token. Then it installs, formats, runs codegen, and makes a git commit.

## 3. Write a command

A command file declares the command. A handler class replies to it. Read ${GUIDE}/commands.md, then the page for whatever else you are adding.

## 4. Run codegen

Run \`seedcord codegen\` after you add or change a command. The handler generics read the tables it writes.

## 5. Check every claim before you write it

Fetch the page for the surface you are using. Every page answers at its own url plus \`.md\`, so ${GUIDE}/checks/gates.md is the Gates page.
`;

export const SEEDCORD_SKILL: Skill = { name: 'seedcord', description: DESCRIPTION, body: BODY };
