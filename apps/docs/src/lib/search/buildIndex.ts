import {
    buildEntityHref,
    buildPackageBasePath,
    formatDisplayPackageName,
    kindName,
    memberFragment
} from '@seedcord/docs-engine';
import { DocKind } from '@seedcord/docs-engine/client';

import { getDocsEngine } from '#lib/docs/engine';

import type { SearchIndexEntry, SearchPackage } from './types';
import type { CommandAction, SearchResultKind } from '#components/search/command-palette/types';
import type { DocNode, DocSearchEntry } from '@seedcord/docs-engine';

type Engine = Awaited<ReturnType<typeof getDocsEngine>>;

const RESULT_KINDS: Partial<Record<number, SearchResultKind>> = {
    [DocKind.Class]: 'class',
    [DocKind.Interface]: 'interface',
    [DocKind.Enum]: 'enum',
    [DocKind.EnumMember]: 'enumMember',
    [DocKind.TypeAlias]: 'type',
    [DocKind.TypeParameter]: 'typeParameter',
    [DocKind.Function]: 'function',
    [DocKind.Method]: 'method',
    [DocKind.Constructor]: 'constructor',
    [DocKind.CallSignature]: 'function',
    [DocKind.ConstructorSignature]: 'constructor',
    [DocKind.GetSignature]: 'property',
    [DocKind.SetSignature]: 'property',
    [DocKind.Accessor]: 'property',
    [DocKind.Property]: 'property',
    [DocKind.Variable]: 'variable',
    [DocKind.Parameter]: 'parameter'
};

const ENTITY_KINDS = new Set<SearchResultKind>(['class', 'interface', 'enum', 'type', 'function', 'variable']);

const resultKind = (kind: number): SearchResultKind => RESULT_KINDS[kind] ?? 'page';

const encodeSlug = (slug: string): string => slug.split('/').map(encodeURIComponent).join('/');

function breadcrumb(entry: DocSearchEntry): string {
    const pkg = entry.packageVersion ? `${entry.packageName}@${entry.packageVersion}` : entry.packageName;
    const qualified = entry.qualifiedName && entry.qualifiedName !== entry.name ? entry.qualifiedName : entry.slug;
    return [pkg, qualified].filter(Boolean).join(' · ');
}

function declaringMemberSlug(parameterSlug: string): string | null {
    const segments = parameterSlug.split('/');
    return segments.length > 1 ? segments.slice(0, -1).join('/') : null;
}

function pageHref(entry: DocSearchEntry): string {
    return `${buildPackageBasePath(entry.packageName, entry.packageVersion ?? null)}/${encodeSlug(entry.slug)}`;
}

class SearchLinks {
    constructor(private readonly engine: Engine) {}

    href(entry: DocSearchEntry, kind: SearchResultKind): string {
        if (ENTITY_KINDS.has(kind)) return this.entityHref(entry, kind);
        if (kind === 'page') return pageHref(entry);
        return this.memberHref(entry, kind);
    }

    private node(entry: DocSearchEntry, slug: string): DocNode | null {
        return this.engine.getNodeByGlobalSlug(entry.packageName, slug);
    }

    private entityHref(entry: DocSearchEntry, kind: SearchResultKind): string {
        const node = this.node(entry, entry.slug) ?? this.engine.getNodeBySlug(entry.packageName, entry.slug);
        return buildEntityHref({
            name: node ? node.sourcePackage.name : entry.packageName,
            slug: entry.slug,
            version: node ? node.sourcePackage.version : (entry.packageVersion ?? null),
            tone: kind
        });
    }

    private closestEntityAbove(entry: DocSearchEntry): DocNode | null {
        const segments = entry.slug.split('/');
        for (let index = segments.length; index > 0; index -= 1) {
            const candidate = this.node(entry, segments.slice(0, index).join('/'));
            if (candidate && ENTITY_KINDS.has(resultKind(candidate.kind))) return candidate;
        }
        return null;
    }

    private memberHref(entry: DocSearchEntry, kind: SearchResultKind): string {
        const owner = this.closestEntityAbove(entry);
        if (!owner) return pageHref(entry);

        const ownerHref = buildEntityHref({
            name: owner.sourcePackage.name,
            slug: owner.slug,
            version: owner.packageVersion ?? entry.packageVersion ?? null,
            tone: kindName(owner.kind)
        });

        const anchorSlug = kind === 'parameter' ? declaringMemberSlug(entry.slug) : entry.slug;
        const anchor = anchorSlug === null ? null : this.node(entry, anchorSlug);
        return anchor ? `${ownerHref}#${memberFragment(anchor)}` : ownerHref;
    }
}

function toIndexEntry(links: SearchLinks, entry: DocSearchEntry): SearchIndexEntry {
    const { summary, value, ...scored } = entry;
    const kind = resultKind(entry.kind);
    const action: CommandAction = {
        id: `${entry.packageName}:${entry.slug}:${entry.kind}`,
        label: entry.name,
        path: breadcrumb(entry),
        href: links.href(entry, kind),
        kind,
        ...(summary ? { description: summary } : {}),
        ...(value ? { value } : {})
    };
    return { ...scored, action };
}

export async function searchPackages(): Promise<SearchPackage[]> {
    const engine = await getDocsEngine();
    const packages = await engine.listPackages();
    return Promise.all(
        packages.map(async ({ folder, fullName }) => {
            const entry = await engine.getEntry(folder);
            return {
                id: folder,
                label: formatDisplayPackageName(fullName),
                fullName,
                stable: entry?.stable?.latest ?? null,
                prerelease: entry?.prerelease?.latest ?? null
            };
        })
    );
}

export async function searchIndexFor(packageId: string, versionId: string): Promise<SearchIndexEntry[] | null> {
    const engine = await getDocsEngine();
    const pkg = (await engine.listPackages()).find(({ folder }) => folder === packageId);
    if (!pkg) return null;

    await engine.setVersion(pkg.folder, versionId);
    const links = new SearchLinks(engine);
    return (engine.getPackage(pkg.fullName)?.indexes.search ?? []).reduce<SearchIndexEntry[]>((entries, entry) => {
        if (entry.slug !== '') entries.push(toIndexEntry(links, entry));
        return entries;
    }, []);
}
