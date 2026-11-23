import { PRODUCTION_SITES } from '@seedcord/brand';

import { GUIDE, HOME } from './sites';
import { AGENT_SKILLS_BASE, skillUrl } from './skills';
import { RULES, SEEDCORD_SKILL } from './skills/seedcord';

const SITES = { home: HOME, guide: GUIDE, docs: PRODUCTION_SITES.docs };

export type SeedcordSite = keyof typeof SITES;

// all three are in the IANA link relation registry
const RELATIONS = ['service-doc', 'index', 'related'] as const;

// a site's list doesn't include a relation that points at itself
const SITE_RELATIONS: Record<SeedcordSite, Partial<Record<(typeof RELATIONS)[number], SeedcordSite>>> = {
    home: { 'service-doc': 'docs', related: 'guide' },
    guide: { 'service-doc': 'docs', index: 'home' },
    docs: { index: 'home', related: 'guide' }
};

// llms.txt v2 asks for describedby
const LLMS_TXT = 'llms.txt';
const SKILLS_INDEX = HOME.at(`${AGENT_SKILLS_BASE}/index.json`);

export interface AgentLink {
    rel: string;
    href: string;
    type?: string;
}

/** The relations that a site repeats on every page, for the html head and the `Link` header alike. */
export function siteLinks(site: SeedcordSite): AgentLink[] {
    const links: AgentLink[] = [
        { rel: 'describedby', href: `${SITES[site].path}/${LLMS_TXT}` },
        { rel: 'service-meta', href: SKILLS_INDEX }
    ];

    for (const rel of RELATIONS) {
        const target = SITE_RELATIONS[site][rel];
        if (target !== undefined) links.push({ rel, href: SITES[target].url });
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
 * On a site that publishes a markdown copy of the page, pass `twin` as the path that serves it.
 */
export function agentLinkHeader(site: SeedcordSite, twin?: string): string {
    const twinLink: AgentLink[] = twin === undefined ? [] : [{ rel: 'alternate', href: twin, type: 'text/markdown' }];

    return [...twinLink, ...siteLinks(site)].map(serialize).join(', ');
}

const SKILL_URL = HOME.at(skillUrl(SEEDCORD_SKILL));

const SKILL_RULE = `The steps for starting or porting a bot are at ${SKILL_URL}.`;

const REFERENCE_RULE = `The API reference is at ${PRODUCTION_SITES.docs.url}, one page per symbol.`;
const GUIDE_RULE = `The guide is at ${GUIDE.url}, one page per feature.`;
const HOME_RULE = `The project site is at ${HOME.url}.`;

// a reader already on the site doesn't get a line pointing back at it
const SITE_RULES: Record<SeedcordSite, string[]> = {
    home: [REFERENCE_RULE, GUIDE_RULE],
    guide: [REFERENCE_RULE, HOME_RULE],
    docs: [GUIDE_RULE, HOME_RULE]
};

/** What an agent needs before it writes seedcord code. Every `llms.txt` opens with these. */
export function agentRules(site: SeedcordSite): string[] {
    return [...RULES, SKILL_RULE, ...SITE_RULES[site]];
}

const FEATURES_HEADING = '## Features';
const BULLET = '- ';

/** The feature bullets out of the root README. The README is the one place anyone writes them. */
export function readmeFeatures(markdown: string): string[] {
    const lines = markdown.split('\n');
    const start = lines.indexOf(FEATURES_HEADING);
    if (start === -1) return [];

    const features: string[] = [];
    for (const line of lines.slice(start + 1)) {
        if (line.startsWith('#')) break;
        if (line.startsWith(BULLET)) features.push(line.slice(BULLET.length).trim());
    }

    return features;
}
