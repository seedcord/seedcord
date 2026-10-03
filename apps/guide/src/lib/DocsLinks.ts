import { buildEntityHref, buildPackageBasePath, DEFAULT_VERSION, slugifySegment } from '@seedcord/docs-engine/client';
import { workspaceIndexLoader } from '@seedcord/docs-engine/workspace';

import { DOCS_URL } from './site';

import type { SymbolRef } from './SymbolRef';
import type { IndexJson } from '@seedcord/docs-engine/client';

// the reference site renders each symbol under its kind's directory, with a member as an anchor on its owner
export class DocsLinks {
    private static loading: Promise<DocsLinks> | undefined;
    private static loaded: DocsLinks | undefined;

    private constructor(private readonly index: IndexJson) {}

    static async load(): Promise<DocsLinks> {
        DocsLinks.loading ??= workspaceIndexLoader()
            .load()
            .then((index) => (DocsLinks.loaded = new DocsLinks(index)))
            .catch((error: unknown) => {
                DocsLinks.loading = undefined;
                throw error;
            });
        return DocsLinks.loading;
    }

    // the twoslash renderer runs sync, after twoslashBlock awaited load()
    static current(): DocsLinks {
        if (!DocsLinks.loaded) throw new Error('read the reference index with DocsLinks.load() first');
        return DocsLinks.loaded;
    }

    hasPackage(pkg: string): boolean {
        return Object.hasOwn(this.index.packages, pkg);
    }

    href({ pkg, owner, member, isPackage }: SymbolRef): string | null {
        const entry = this.hasPackage(pkg) ? this.index.packages[pkg] : undefined;
        if (!entry) return null;
        if (isPackage) return `${DOCS_URL}${buildPackageBasePath(entry.fullName, DEFAULT_VERSION)}`;

        const slug = slugifySegment(owner);
        const tone = entry.entities?.[slug];
        if (!tone) return null;

        const page = buildEntityHref({ name: entry.fullName, slug, tone, version: DEFAULT_VERSION });
        return `${DOCS_URL}${page}${member ? `#${slugifySegment(member)}` : ''}`;
    }
}
