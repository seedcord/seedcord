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

    get exportDir(): string {
        return `dist${this.path}`;
    }

    at(path: string): string {
        if (path === '') return this.url;
        return `${this.url}/${path.replace(/^\/+/, '')}`;
    }
}

export const PRODUCTION_ORIGIN = 'https://seedcord.org';

export const PRODUCTION_SITES = {
    home: new SiteAddress(PRODUCTION_ORIGIN),
    guide: new SiteAddress(`${PRODUCTION_ORIGIN}/guide`),
    docs: new SiteAddress(`${PRODUCTION_ORIGIN}/docs`)
} as const;
