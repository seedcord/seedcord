import { DOCS_URL, GUIDE_URL, HOME_URL } from './sites';
import { AGENT_SKILLS_BASE, skillUrl } from './skills';
import { SEEDCORD_SKILL } from './skills/seedcord';

// all three are in the IANA link relation registry
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

const SKILL_URL = `${GUIDE_URL}${skillUrl(SEEDCORD_SKILL)}`;

/** All three sites serve the same `SKILL.md`. This sends docs and home to the guide's copy. */
export function canonicalSkillHeader(): string {
    return `<${SKILL_URL}>; rel="canonical"`;
}

const FRAMEWORK_RULES = [
    'seedcord has no presence in training data. Read a page before you write code against it.',
    "`seedcord` on npm is the command line tool. A bot installs `@seedcord/gateway` for a websocket connection, or `@seedcord/http` to answer Discord's interactions endpoint. It installs one of the two.",
    'Read the current version of every package from the npm registry. Each one has its own version number.',
    'A command is declared in one file and answered in another, by a handler class carrying a route decorator. seedcord reads those decorators at startup and dispatches every interaction itself.',
    '`seedcord codegen` writes the typed tables for slash commands, user and message context menus, emojis, and plugin keys. Run it after changing any of those.',
    `The steps for building a bot are at ${SKILL_URL}.`
];

const REFERENCE_RULE = `The API reference is at ${DOCS_URL}, one page per symbol.`;
const GUIDE_RULE = `The guide is at ${GUIDE_URL}, one page per feature.`;
const HOME_RULE = `The project site is at ${HOME_URL}.`;

// a reader already on the site gets no line pointing back at it
const SITE_RULES: Record<SeedcordSite, string[]> = {
    home: [REFERENCE_RULE, GUIDE_RULE],
    guide: [REFERENCE_RULE, HOME_RULE],
    docs: [GUIDE_RULE, HOME_RULE]
};

/** What an agent needs before it writes seedcord code. Every `llms.txt` opens with these. */
export function agentRules(site: SeedcordSite): string[] {
    return [...FRAMEWORK_RULES, ...SITE_RULES[site]];
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
