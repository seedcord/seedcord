import { buildEntityHref } from '@seedcord/docs-engine';
import { cache } from 'react';

import { getToneTitle, TONE_ORDER } from '#lib/tonePresentation';

import { getDocsEngine } from './engine';

import type { NavigationCategory, NavigationEntityItem } from './types';
import type { DirectoryEntity, VersionedDocsEngine } from '@seedcord/docs-engine';
import type { EntityTone } from '@seedcord/docs-engine/client';

const TONE_ENTITIES = {
    class: 'classes',
    interface: 'interfaces',
    function: 'functions',
    enum: 'enums',
    type: 'types',
    variable: 'variables'
} as const satisfies Record<EntityTone, DirectoryEntity>;

export interface ReexportLink {
    name: string;
    owner: string;
    href: string;
    tone: EntityTone | null;
}

function byLabel(a: NavigationEntityItem, b: NavigationEntityItem): number {
    return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
}

// setVersion switches the whole engine. read an instance before opening another version on the same engine
export class ActiveVersion {
    private constructor(
        private readonly engine: VersionedDocsEngine,
        private readonly fullName: string
    ) {}

    static async open(engine: VersionedDocsEngine, folder: string, versionId: string): Promise<ActiveVersion | null> {
        const entry = await engine.getEntry(folder);
        if (!entry) return null;

        try {
            await engine.setVersion(folder, versionId);
        } catch {
            return null;
        }

        return new ActiveVersion(engine, entry.fullName);
    }

    get categories(): NavigationCategory[] {
        const directory = this.engine.getPackageDirectory(this.fullName);
        if (!directory) return [];

        return TONE_ORDER.flatMap((tone) => {
            const entity = TONE_ENTITIES[tone];
            const items = Array.from(directory.entries(entity), ([slug, node]) => ({
                id: slug,
                label: node.name,
                href: buildEntityHref({
                    name: node.sourcePackage.name,
                    version: node.sourcePackage.version,
                    slug,
                    tone
                })
            })).sort(byLabel);

            return items.length > 0 ? [{ id: entity, title: getToneTitle(tone), tone, items }] : [];
        });
    }

    get readme(): string | null {
        return this.package?.manifest.readme ?? null;
    }

    get changelogUrl(): string | null {
        return this.package?.manifest.changelogUrl ?? null;
    }

    // each re-export links to the page of the package that declares it
    get reexports(): ReexportLink[] {
        const resolver = this.engine.resolver();

        return (this.package?.root.reexports ?? []).reduce<ReexportLink[]>((links, ref) => {
            // adapter.buildReexports always sets packageName
            if (!ref.packageName) return links;
            const href = resolver.href(this.fullName, ref);
            if (href)
                links.push({ name: ref.name, owner: ref.packageName, href, tone: resolver.crossPackageTone(ref) });
            return links;
        }, []);
    }

    private get package(): ReturnType<VersionedDocsEngine['getPackage']> {
        return this.engine.getPackage(this.fullName);
    }
}

// the layout and the overview page share one project.json fetch per request
export const loadActiveVersion = cache(async (folder: string, versionId: string): Promise<ActiveVersion | null> =>
    ActiveVersion.open(await getDocsEngine(), folder, versionId)
);
