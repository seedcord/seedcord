import { REPO_URL, SITE_DESCRIPTION, SITE_URL } from '#lib/site';

export const dynamic = 'force-static';
export const revalidate = false;

const BODY = `# seedcord

> ${SITE_DESCRIPTION}

seedcord is a class + decorator framework for building Discord bots on top of discord.js 14, written in TypeScript. It wires routing, interactions, events, gates, lifecycle and plugins, all typed end to end, so a wrong route or option is a compile error before the bot connects.

## Features
- Typed slash commands, options and autocomplete, derived from the discord.js builder via codegen
- A typed customId codec for packing state into component ids
- Composable, compile-checked permission, role and cooldown gates
- Button, select-menu and modal handlers, ComponentsV2-first
- Restart-proof pagination
- Coordinated lifecycle (startup, shutdown, health), scoped logging, a sliding-window rate limiter, a typed pub/sub bus
- Vite HMR hot reload that keeps the gateway alive, an Ink dev terminal, and codegen

## Links
- Site: ${SITE_URL}
- Docs: https://docs.seedcord.org
- Guide: https://guide.seedcord.org
- Source: ${REPO_URL}
- License: Apache-2.0
`;

export function GET(): Response {
    return new Response(BODY, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
