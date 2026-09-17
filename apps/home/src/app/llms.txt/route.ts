import { readFileSync } from 'node:fs';
import path from 'node:path';

import { agentRules, readmeFeatures } from '@seedcord/ui/agents';

import { DOCS_URL, GUIDE_URL, REPO_URL, SITE_DESCRIPTION, SITE_URL } from '#lib/site';

export const dynamic = 'force-static';
export const revalidate = false;

// next build runs this from apps/home. the static export bakes the result in
const README = path.join(process.cwd(), '../../README.md');

function bullets(lines: readonly string[]): string {
    return lines.map((line) => `- ${line}`).join('\n');
}

const BODY = `# seedcord

> ${SITE_DESCRIPTION}

${bullets(agentRules('home'))}

seedcord is a class + decorator framework for building Discord bots on top of discord.js 14, written in TypeScript. It wires routing, interactions, events, gates, lifecycle and plugins, all typed end to end, so a wrong route or option is a compile error before the bot connects.

## Features

${bullets(readmeFeatures(readFileSync(README, 'utf8')))}

## Links

- Site: ${SITE_URL}
- Docs: ${DOCS_URL}
- Guide: ${GUIDE_URL}
- Source: ${REPO_URL}
- License: Apache-2.0
`;

export function GET(): Response {
    return new Response(BODY, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
