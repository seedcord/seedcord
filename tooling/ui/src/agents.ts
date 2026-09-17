import { DOCS_URL, GUIDE_URL, HOME_URL } from './sites';
import { AGENT_SKILLS_BASE } from './skills';

// RFC 8288 registers all three
const RELATIONS = ['service-doc', 'index', 'related'] as const;

type SiteRelations = Partial<Record<(typeof RELATIONS)[number], string>>;

// every relation a site would point at itself is left out
const SEEDCORD_SITES = {
    home: { 'service-doc': DOCS_URL, related: GUIDE_URL },
    guide: { 'service-doc': DOCS_URL, index: HOME_URL },
    docs: { index: HOME_URL, related: GUIDE_URL }
} satisfies Record<string, SiteRelations>;

export type SeedcordSite = keyof typeof SEEDCORD_SITES;

// llms.txt v2 asks for describedby
const LLMS_TXT = '/llms.txt';
const SKILLS_INDEX = `${AGENT_SKILLS_BASE}/index.json`;

function link(target: string, rel: string, type?: string): string {
    const media = type === undefined ? '' : `; type="${type}"`;
    return `<${target}>; rel="${rel}"${media}`;
}

/**
 * The `Link` header a site sends on every html page.
 *
 * Pass `twin` on a site that publishes a markdown copy of the page, as the path that serves it.
 */
export function agentLinkHeader(site: SeedcordSite, twin?: string): string {
    const own: SiteRelations = SEEDCORD_SITES[site];
    const links = twin === undefined ? [] : [link(twin, 'alternate', 'text/markdown')];

    links.push(link(LLMS_TXT, 'describedby'), link(SKILLS_INDEX, 'service-meta'));
    for (const rel of RELATIONS) {
        const target = own[rel];
        if (target !== undefined) links.push(link(target, rel));
    }

    return links.join(', ');
}
