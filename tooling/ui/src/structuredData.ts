export const HOME_URL = 'https://seedcord.org';
export const REPO_URL = 'https://github.com/seedcord/seedcord';
const GITHUB_ORG_URL = 'https://github.com/seedcord';
export const NPM_ORG_URL = 'https://www.npmjs.com/org/seedcord';
export const DISCORD_URL = 'https://discord.gg/DzFxY58WXf';
export const AUTHOR_URL = 'https://materwelon.dev';
export const AUTHOR_GITHUB_URL = 'https://github.com/materwelonDhruv';
// matches the GitHub repository description
const SEEDCORD_DESCRIPTION =
    "seedcord is a strongly typed TypeScript framework for making discord.js bots. It wires and types your bot for you, on both gateway and http interactions. You write your bot's features, and nothing else.";

// Google merges nodes that share an @id across sites
const ORG_ID = `${HOME_URL}/#organization`;
const SOFTWARE_ID = `${HOME_URL}/#software`;

export interface SiteIdentity {
    name: string;
    url: string;
    description: string;
}

export function seedcordJsonLd(site: SiteIdentity): string {
    const graph = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                '@id': ORG_ID,
                name: 'seedcord',
                url: HOME_URL,
                logo: `${HOME_URL}/icon`,
                sameAs: [GITHUB_ORG_URL, REPO_URL, NPM_ORG_URL, DISCORD_URL]
            },
            {
                '@type': 'SoftwareSourceCode',
                '@id': SOFTWARE_ID,
                name: 'seedcord',
                alternateName: 'seedcord Discord bot framework',
                description: SEEDCORD_DESCRIPTION,
                url: HOME_URL,
                codeRepository: REPO_URL,
                programmingLanguage: 'TypeScript',
                runtimePlatform: 'Node.js',
                license: 'https://www.apache.org/licenses/LICENSE-2.0',
                publisher: { '@id': ORG_ID },
                author: { '@type': 'Person', name: 'Dhruv', url: AUTHOR_URL, sameAs: [AUTHOR_GITHUB_URL] }
            },
            {
                '@type': 'WebSite',
                '@id': `${site.url}/#website`,
                name: site.name,
                description: site.description,
                url: site.url,
                publisher: { '@id': ORG_ID },
                about: { '@id': SOFTWARE_ID }
            }
        ]
    };

    // escape < so the JSON can't break out of the script tag
    return JSON.stringify(graph).replaceAll('<', String.raw`\u003c`);
}
