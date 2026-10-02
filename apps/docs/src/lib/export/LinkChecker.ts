import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { DOCS } from '@seedcord/ui/sites';

import { DocsWorker } from '#lib/worker/DocsWorker';

import type { DocsBucket, DocsObject } from '#lib/worker/DocsWorker';

export interface BrokenLink {
    href: string;
    page: string;
    status: number;
}

const DOCS_LINK = new RegExp(`href="(${DOCS.path}(?:/[^"#?]*)?)`, 'g');
const ORIGIN = new URL(DOCS.url).origin;
const MAX_REDIRECTS = 3;

class FolderBucket implements DocsBucket {
    constructor(private readonly root: string) {}

    async get(key: string): Promise<DocsObject | null> {
        try {
            return { body: await readFile(path.join(this.root, key)), httpEtag: '' };
        } catch {
            return null;
        }
    }
}

// resolves every docs link in an export folder through the worker production runs
export class LinkChecker {
    private readonly worker: DocsWorker;

    constructor(private readonly root: string) {
        this.worker = new DocsWorker(new FolderBucket(root));
    }

    async broken(): Promise<BrokenLink[]> {
        const broken: BrokenLink[] = [];
        for (const [href, page] of await this.links()) {
            const response = await this.resolve(href);
            if (!response.ok) broken.push({ href, page, status: response.status });
        }
        return broken;
    }

    // each distinct link, with the first page that carries it
    private async links(): Promise<Map<string, string>> {
        const pages = (await readdir(this.root, { recursive: true })).filter((file) => file.endsWith('.html'));
        const links = new Map<string, string>();
        for (const page of pages.sort()) {
            const html = await readFile(path.join(this.root, page), 'utf8');
            for (const [, href] of html.matchAll(DOCS_LINK)) {
                if (href && !links.has(href)) links.set(href, page);
            }
        }
        return links;
    }

    private async resolve(href: string): Promise<Response> {
        let url = new URL(href, ORIGIN);
        let response = await this.worker.respond(new Request(url));
        for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
            const location = response.headers.get('location');
            if (!location) break;
            url = new URL(location, url);
            response = await this.worker.respond(new Request(url));
        }
        return response;
    }
}
