import { buildEntityHref, DEFAULT_VERSION, toneToDirectory } from '@seedcord/docs-engine/client';
import { RuntimeBuild } from '@seedcord/docs-generator/runtime-build';
import { cache } from 'react';

import { getToneTitle, TONE_ORDER } from '#lib/tonePresentation';

import { getDocsEngine } from './engine';

import type { NavigationCategory, NavigationEntityItem } from './types';
import type { DocNode, DocPackageModel, PackageDirectory, VersionedDocsEngine } from '@seedcord/docs-engine';
import type { EntityTone } from '@seedcord/docs-engine/client';

export interface ReexportLink {
    name: string;
    owner: string;
    href: string;
    tone: EntityTone | null;
}

function byLabel(a: NavigationEntityItem, b: NavigationEntityItem): number {
    return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
}

// one package at one version, read once when it opens
export class ActiveVersion {
    readonly categories: NavigationCategory[];
    readonly pages: NavigationEntityItem[];
    readonly readme: string | null;
    readonly changelogUrl: string | null;
    readonly folderUrl: string | undefined;

    private constructor(
        model: DocPackageModel,
        private readonly versionSegment: string,
        readonly reexports: ReexportLink[]
    ) {
        this.categories = TONE_ORDER.flatMap((tone) => {
            const items = this.items(model.listed, tone).sort(byLabel);
            return items.length > 0 ? [{ id: toneToDirectory(tone), title: getToneTitle(tone), tone, items }] : [];
        });
        this.pages = TONE_ORDER.flatMap((tone) => this.items(model.pages, tone));
        this.readme = model.manifest.readme ?? null;
        this.changelogUrl = model.manifest.changelogUrl ?? null;
        this.folderUrl = model.manifest.folderUrl;
    }

    static async open(engine: VersionedDocsEngine, folder: string, versionId: string): Promise<ActiveVersion | null> {
        const entry = await engine.getEntry(folder);
        if (!entry) return null;

        try {
            await engine.setVersion(folder, versionId);
        } catch {
            return null;
        }

        const model = engine.getPackage(entry.fullName);
        return model && new ActiveVersion(model, versionId, ActiveVersion.reexportLinks(engine, model));
    }

    private static reexportLinks(engine: VersionedDocsEngine, model: DocPackageModel): ReexportLink[] {
        const resolver = engine.resolver();
        return (model.root.reexports ?? []).flatMap((ref) => {
            const href = resolver.href(model.manifest.name, ref);
            return href ? [{ name: ref.name, owner: ref.packageName, href, tone: resolver.crossPackageTone(ref) }] : [];
        });
    }

    private items(directory: PackageDirectory, tone: EntityTone): NavigationEntityItem[] {
        return Array.from(directory.entries(tone), ([slug, node]) => ({
            id: slug,
            label: new RuntimeBuild(node.condition).label(node.name),
            href: buildEntityHref({ name: node.sourcePackage.name, version: this.versionOf(node), slug, tone })
        }));
    }

    // a latest page keeps the reader on latest
    private versionOf(node: DocNode): string {
        return this.versionSegment === DEFAULT_VERSION ? DEFAULT_VERSION : node.sourcePackage.version;
    }
}

// the layout and the overview page share one project.json fetch per request
export const loadActiveVersion = cache(async (folder: string, versionId: string): Promise<ActiveVersion | null> =>
    ActiveVersion.open(await getDocsEngine(), folder, versionId)
);
