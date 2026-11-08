import { PRODUCTION_SITES } from '@seedcord/brand';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { agentRules, readmeFeatures } from '@seedcord/ui/agents';

import { FEED_PATH, twinPath } from '#lib/blog/paths';
import { canonicalUrl, GUIDE_URL, REPO_URL, SITE_DESCRIPTION, SITE_URL } from '#lib/site';

import type { PostSummary } from '#lib/blog/summary';

// next build runs this from apps/home. the static export writes the text to a file
const README = path.join(process.cwd(), '../../README.md');

function bullets(lines: readonly string[]): string {
    return lines.map((line) => `- ${line}`).join('\n');
}

function blogSection(posts: readonly PostSummary[]): string {
    if (posts.length === 0) return '';

    const links = posts.map((post) => `[${post.title}](${canonicalUrl(twinPath(post.slug))}): ${post.description}`);
    return `\n## Blog\n\n${bullets(links)}\n`;
}

export const llmsText = (posts: readonly PostSummary[]): string => `# seedcord

> ${SITE_DESCRIPTION}

${bullets(agentRules('home'))}

seedcord is a class + decorator framework for building Discord bots in TypeScript. It routes interactions and events to your handler classes and runs your gates, lifecycle hooks and plugins, all typed end to end. A wrong route or option is a compile error before the bot connects. The gateway transport runs on the discord.js 14 client. The http transport has no discord.js dependency.

## Features

${bullets(readmeFeatures(readFileSync(README, 'utf8')))}

## Links

- Site: ${SITE_URL}
- Guide index: ${GUIDE_URL}/llms.txt
- Docs index: ${PRODUCTION_SITES.docs.url}/llms.txt
- Blog feed: ${canonicalUrl(FEED_PATH)}
- Source: ${REPO_URL}
- License: Apache-2.0
${blogSection(posts)}`;
