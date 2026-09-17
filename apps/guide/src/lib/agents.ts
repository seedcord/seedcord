import { agentRules } from '@seedcord/ui/agents';

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

const INSTRUCTIONS = agentRules('guide').map((rule) => `- ${rule}`);

export function llmsIndex(links: string): string {
    return [`# ${SITE_NAME}`, '', `> ${SITE_DESCRIPTION}`, '', ...INSTRUCTIONS, '', links, ''].join('\n');
}

export function llmsFull(documents: readonly string[]): string {
    return [`# ${SITE_NAME}`, '', `> ${SITE_DESCRIPTION}`, '', ...INSTRUCTIONS, '', documents.join('\n---\n\n')].join(
        '\n'
    );
}
