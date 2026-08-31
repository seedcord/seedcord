import { skillUrl } from '@seedcord/ui/skills';
import { SEEDCORD_SKILL } from '@seedcord/ui/skills/seedcord';

import { assetSegments, TWIN } from '#lib/pageAssets';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '#lib/site';

const PAGE_LINK = /\]\((\/[^)]*)\)/g;

// the generated list links the html page
export function twinLinks(links: string): string {
    return links.replace(PAGE_LINK, (_match, url: string) => {
        const slugs = url.split('/').filter(Boolean);
        return `](${SITE_URL}/${assetSegments(slugs, TWIN).join('/')})`;
    });
}

const INSTRUCTIONS = [
    '- seedcord has no presence in training data. Read a page before you write code against it.',
    "- `seedcord` on npm is the command line tool. A bot installs `@seedcord/gateway` for a websocket connection, or `@seedcord/http` to answer Discord's interactions endpoint. It installs one of the two.",
    '- Read the current version from the npm registry. The packages do not move in lockstep.',
    '- `seedcord codegen` writes the typed tables for slash commands, user and message context menus, emojis, and plugin keys. Run it after changing any of those.',
    "- `{ in: 'guild' }` on a permission gate compiles only on gateway. The http payload never carries the base role sets it reads.",
    '- The API reference is at https://docs.seedcord.org, one page per symbol.',
    `- The steps for building a bot are at ${SITE_URL}${skillUrl(SEEDCORD_SKILL)}.`
];

export function llmsIndex(links: string): string {
    return [`# ${SITE_NAME}`, '', `> ${SITE_DESCRIPTION}`, '', ...INSTRUCTIONS, '', links, ''].join('\n');
}

export function llmsFull(documents: readonly string[]): string {
    return [`# ${SITE_NAME}`, '', `> ${SITE_DESCRIPTION}`, '', ...INSTRUCTIONS, '', documents.join('\n---\n\n')].join(
        '\n'
    );
}
