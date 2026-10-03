import { DEFAULT_VERSION, replacementVersion, validateIndex } from '@seedcord/docs-engine/client';
import { agentLinkHeader } from '@seedcord/ui/agents';
import { PageAsset, TWIN } from '@seedcord/ui/page-asset';
import { DOCS } from '@seedcord/ui/sites';

import type { IndexJson } from '@seedcord/docs-engine/client';

export interface DocsObject {
    body: BodyInit;
    httpEtag: string;
}

export interface DocsBucket {
    get(key: string): Promise<DocsObject | null>;
}

const PERMANENT_REDIRECT = 308;
const NOT_FOUND = 404;
const PRODUCTION_HOST = new URL(DOCS.url).hostname;

const HTML = 'text/html; charset=utf-8';

const CONTENT_TYPES = {
    '.html': HTML,
    // next's export client accepts text/plain for its navigation payloads
    '.txt': 'text/plain; charset=utf-8',
    '.md': 'text/markdown; charset=utf-8',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2'
} as const;

type Extension = keyof typeof CONTENT_TYPES;

const EXTENSIONLESS_ROUTES: Partial<Record<string, string>> = { icon: 'image/png' };

const HASHED_BUILD_FILES = '_next/static/';
const IMMUTABLE = 'public, max-age=31536000, immutable';
const SHORT_LIVED = 'public, max-age=300';

function isExtension(value: string): value is Extension {
    return Object.hasOwn(CONTENT_TYPES, value);
}

function extensionOf(key: string): Extension | undefined {
    const name = key.slice(key.lastIndexOf('/') + 1);
    const extension = name.slice(name.lastIndexOf('.'));
    return isExtension(extension) ? extension : undefined;
}

class DocsPath {
    constructor(public readonly path: string) {}

    get key(): string {
        if (this.path === '') return 'index.html';
        if (this.path.startsWith(HASHED_BUILD_FILES) || EXTENSIONLESS_ROUTES[this.path] !== undefined) return this.path;

        const asset = PageAsset.forPath(this.path);
        if (asset) return `${asset.directory}/${this.path}`;
        return extensionOf(this.path) === undefined ? `${this.path}.html` : this.path;
    }

    get contentType(): string {
        const key = this.key;
        return EXTENSIONLESS_ROUTES[key] ?? CONTENT_TYPES[extensionOf(key) ?? '.html'];
    }

    get isPackagePage(): boolean {
        return this.path.startsWith('packages/') && extensionOf(this.key) === '.html';
    }
}

export class DocsWorker {
    constructor(private readonly bucket: DocsBucket) {}

    async respond(request: Request): Promise<Response> {
        const url = new URL(request.url);
        if (!url.pathname.startsWith(DOCS.path)) return this.notFound(url);
        const below = url.pathname.slice(DOCS.path.length);

        // next fetches the root's navigation payload from /docs.txt
        if (below === '.txt') return this.serve(new DocsPath('index.txt'), url);
        // the zone route seedcord.org/docs* also matches /docsfoo
        if (below !== '' && !below.startsWith('/')) return this.notFound(url);
        if (below.endsWith('/')) return DocsWorker.redirect(`${DOCS.path}${below.replace(/\/+$/, '')}${url.search}`);

        return this.serve(new DocsPath(below.slice(1)), url);
    }

    private async serve(path: DocsPath, url: URL): Promise<Response> {
        const object = await this.bucket.get(path.key);
        if (!object) return (await this.replacedPatch(path, url)) ?? (await this.notFound(url));

        const headers = new Headers({
            'content-type': path.contentType,
            etag: object.httpEtag,
            'cache-control': path.key.startsWith(HASHED_BUILD_FILES) ? IMMUTABLE : SHORT_LIVED
        });
        if (path.contentType === HTML) {
            const twin = path.isPackagePage ? `${DOCS.path}${TWIN.publicPath(path.path)}` : undefined;
            headers.set('link', agentLinkHeader('docs', twin));
        }
        if (path.key.startsWith('search/')) headers.set('x-robots-tag', 'noindex');
        DocsWorker.noindexOffProduction(headers, url);

        return new Response(object.body, { headers });
    }

    // each release removes the previous patch of its line from the index
    private async replacedPatch(path: DocsPath, url: URL): Promise<Response | null> {
        const [root, packageId, versionSegment, ...rest] = path.path.split('/');
        if (root !== 'packages' || packageId === undefined || versionSegment === undefined) return null;

        const extension = rest.length === 0 ? (extensionOf(versionSegment) ?? '') : '';
        const version = versionSegment.slice(0, versionSegment.length - extension.length);
        if (version === DEFAULT_VERSION) return null;

        const entry = (await this.index())?.packages[packageId];
        const replacement = entry ? replacementVersion(entry, version) : null;
        if (replacement === null) return null;

        const moved = [root, packageId, `${replacement}${extension}`, ...rest].join('/');
        return DocsWorker.redirect(`${DOCS.path}/${moved}${url.search}`);
    }

    private async index(): Promise<IndexJson | null> {
        const object = await this.bucket.get('index.json');
        return object ? validateIndex(await new Response(object.body).json()) : null;
    }

    private async notFound(url: URL): Promise<Response> {
        const page = await this.bucket.get('404.html');
        const headers = new Headers({ 'content-type': HTML });
        DocsWorker.noindexOffProduction(headers, url);
        return new Response(page?.body ?? 'Not found', { status: NOT_FOUND, headers });
    }

    private static noindexOffProduction(headers: Headers, url: URL): void {
        if (url.hostname !== PRODUCTION_HOST) headers.set('x-robots-tag', 'noindex, nofollow');
    }

    private static redirect(location: string): Response {
        return new Response(null, { status: PERMANENT_REDIRECT, headers: { location } });
    }
}
