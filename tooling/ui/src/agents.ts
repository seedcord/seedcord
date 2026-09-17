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

export interface AgentLink {
    rel: string;
    href: string;
    type?: string;
}

/** The relations a site repeats on every page, for the html head and the `Link` header alike. */
export function siteLinks(site: SeedcordSite): AgentLink[] {
    const own: SiteRelations = SEEDCORD_SITES[site];
    const links: AgentLink[] = [
        { rel: 'describedby', href: LLMS_TXT },
        { rel: 'service-meta', href: SKILLS_INDEX }
    ];

    for (const rel of RELATIONS) {
        const href = own[rel];
        if (href !== undefined) links.push({ rel, href });
    }

    return links;
}

function serialize({ rel, href, type }: AgentLink): string {
    const media = type === undefined ? '' : `; type="${type}"`;
    return `<${href}>; rel="${rel}"${media}`;
}

/**
 * The `Link` header a site sends on every html page.
 *
 * Pass `twin` on a site that publishes a markdown copy of the page, as the path that serves it.
 */
export function agentLinkHeader(site: SeedcordSite, twin?: string): string {
    const twinLink: AgentLink[] = twin === undefined ? [] : [{ rel: 'alternate', href: twin, type: 'text/markdown' }];

    return [...twinLink, ...siteLinks(site)].map(serialize).join(', ');
}
