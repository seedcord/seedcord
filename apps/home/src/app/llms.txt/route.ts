import { readFileSync } from 'node:fs';
import path from 'node:path';

import { agentRules, readmeFeatures } from '@seedcord/ui/agents';

import { listedPosts } from '#lib/blog/posts';
import { FEED_PATH, twinPath } from '#lib/blog/seo';
import { canonicalUrl, DOCS_URL, GUIDE_URL, REPO_URL, SITE_DESCRIPTION, SITE_URL } from '#lib/site';

import type { PostSummary } from '#lib/blog/post';

export const dynamic = 'force-static';
export const revalidate = false;

// next build runs this from apps/home. the static export bakes the result in
const README = path.join(process.cwd(), '../../README.md');

function bullets(lines: readonly string[]): string {
    return lines.map((line) => `- ${line}`).join('\n');
}

function blogLinks(posts: readonly PostSummary[]): string {
    return bullets(posts.map((post) => `[${post.title}](${canonicalUrl(twinPath(post.slug))}): ${post.description}`));
}

const body = (posts: readonly PostSummary[]): string => `# seedcord

> ${SITE_DESCRIPTION}

${bullets(agentRules('home'))}

seedcord is a class + decorator framework for building Discord bots in TypeScript. It routes interactions and events to your handler classes and runs your gates, lifecycle hooks and plugins, all typed end to end. A wrong route or option is a compile error before the bot connects. The gateway transport runs on the discord.js 14 client. The http transport has no discord.js dependency.

## Features

${bullets(readmeFeatures(readFileSync(README, 'utf8')))}

## Links

- Site: ${SITE_URL}
- Guide index: ${GUIDE_URL}/llms.txt
- Docs index: ${DOCS_URL}/llms.txt
- Blog feed: ${canonicalUrl(FEED_PATH)}
- Source: ${REPO_URL}
- License: Apache-2.0

## Blog

${blogLinks(posts)}
`;

export async function GET(): Promise<Response> {
    const posts = await listedPosts();
    return new Response(body(posts), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
