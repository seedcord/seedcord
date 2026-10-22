// new URL('/x', 'https://seedcord.org/guide') resolves to https://seedcord.org/x
export class SiteAddress {
    readonly url: string;

    constructor(url: string) {
        this.url = url.replace(/\/+$/, '');
    }

    get label(): string {
        return this.url.replace(/^[a-z]+:\/\//, '');
    }

    get path(): string {
        return new URL(this.url).pathname.replace(/\/$/, '');
    }

    at(path: string): string {
        if (path === '') return this.url;
        return `${this.url}/${path.replace(/^\/+/, '')}`;
    }
}

// a path on the current site, like /blog/. a // url points at another host
export const isSitePath = (url: string): boolean => url.startsWith('/') && !url.startsWith('//');

export const absoluteUrl = (url: string, onSite: (path: string) => string): string =>
    isSitePath(url) ? onSite(url) : url;

export const PRODUCTION_ORIGIN = 'https://seedcord.org';

const ORIGIN = new URL(process.env.NEXT_PUBLIC_SITE_ORIGIN ?? PRODUCTION_ORIGIN).origin;

export const HOME = new SiteAddress(ORIGIN);
export const GUIDE = new SiteAddress(`${ORIGIN}/guide`);
export const DOCS = new SiteAddress(`${PRODUCTION_ORIGIN}/docs`);

export const HOME_URL = HOME.url;
export const GUIDE_URL = GUIDE.url;
export const DOCS_URL = DOCS.url;

export const REPO_URL = 'https://github.com/seedcord/seedcord';
export const GITHUB_ORG_URL = 'https://github.com/seedcord';
export const NPM_ORG_URL = 'https://www.npmjs.com/org/seedcord';
export const DISCORD_URL = `${PRODUCTION_ORIGIN}/chat/`;
export const AUTHOR_URL = 'https://materwelon.dev';
export const AUTHOR_GITHUB_URL = 'https://github.com/materwelonDhruv';
