import { agentRules } from '@seedcord/ui/agents';
import { llms } from 'fumadocs-core/source/llms';

import { TWIN } from '@seedcord/ui/PageAsset';

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '#lib/site';

import type { LoaderConfig, LoaderOutput } from 'fumadocs-core/source';

const PAGE_LINK = /\]\((\/[^)]*)\)/g;

// the generated list links the html page
export function twinLinks(links: string): string {
    return links.replace(PAGE_LINK, (_match, url: string) => `](${SITE_URL}${TWIN.publicPath(url)})`);
}

export async function pageLinks<Config extends LoaderConfig>(source: LoaderOutput<Config>): Promise<string> {
    const index = llms(source);
    // index() adds its own heading from meta.json
    const links = await Promise.all(source.getPageTree().children.map((node) => index.indexNode(node)));
    return twinLinks(links.join('\n'));
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
