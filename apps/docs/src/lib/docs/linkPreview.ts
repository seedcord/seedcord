import { buildPackageBasePath, DEFAULT_VERSION } from '@seedcord/docs-engine/client';
import { GUIDE_URL, HOME_URL, REPO_URL } from '@seedcord/ui';
import { accentColor, PREVIEW_EMOJI, SITE_ACCENT } from '@seedcord/ui/link-preview';

import { DocsPage } from '#lib/docs/DocsPage';
import { entityPath } from '#lib/docs/entityJsonLd';
import { ENTITY_TONE_HEX } from '#lib/entityColors';
import { canonicalUrl, SITE_DESCRIPTION } from '#lib/site';
import { getToneTitle } from '#lib/tonePresentation';

import type { ResolvedEntity } from '#lib/docs/resolveEntity';
import type {
    DocsCatalog,
    EntityModel,
    NavigationCategory,
    PackageCatalogEntry,
    PackageVersionCatalog
} from '#lib/docs/types';
import type { LatestVersion, PreviewCardProps, PreviewLink } from '@seedcord/ui/link-preview';

// three kinds fit on one phone line
const KINDS_PER_ROW = 3;

function counted(count: number, one: string, many = `${one}s`): string {
    return `${count} ${count === 1 ? one : many}`;
}

function nonZero(parts: readonly [count: number, one: string, many?: string][]): string[] {
    return parts.reduce<string[]>((shown, [count, one, many]) => {
        if (count > 0) shown.push(counted(count, one, many));
        return shown;
    }, []);
}

function entityCounts(entity: EntityModel): string[] {
    switch (entity.kind) {
        case 'class':
        case 'interface':
            return [
                entity.kind,
                ...nonZero([
                    [entity.constructors.length, 'constructor'],
                    [entity.properties.length, 'property', 'properties'],
                    [entity.methods.length, 'method']
                ])
            ];
        case 'enum':
            return ['enum', ...nonZero([[entity.members.length, 'member']])];
        case 'function': {
            const [first] = entity.signatures;
            if (entity.signatures.length > 1) return ['function', counted(entity.signatures.length, 'overload')];
            return ['function', ...nonZero([[first?.parameters.length ?? 0, 'parameter']])];
        }
        default:
            return [entity.kind];
    }
}

const packageLatestPath = (entry: PackageCatalogEntry): string =>
    buildPackageBasePath(entry.manifestName, DEFAULT_VERSION);

function latestLink(
    entry: PackageCatalogEntry,
    version: PackageVersionCatalog,
    path: string
): LatestVersion | undefined {
    const latest = entry.versions.find((candidate) => candidate.isLatest);
    if (version.isLatest || !latest) return undefined;
    return { label: latest.label, url: canonicalUrl(path) };
}

export function docsFrontPreview(catalog: DocsCatalog): PreviewCardProps {
    const symbols = catalog.reduce(
        (sum, entry) => sum + [...entry.symbolCounts.values()].reduce((total, count) => total + count, 0),
        0
    );
    return {
        accent: SITE_ACCENT.docs,
        breadcrumb: ['docs'],
        breadcrumbEmoji: PREVIEW_EMOJI.docs,
        title: 'API reference',
        body: SITE_DESCRIPTION,
        subtext: [counted(catalog.length, 'package'), counted(symbols, 'symbol')],
        links: [
            { emoji: PREVIEW_EMOJI.home, label: 'Home', url: HOME_URL },
            { emoji: PREVIEW_EMOJI.guide, label: 'Guide', url: GUIDE_URL },
            { emoji: PREVIEW_EMOJI.github, label: 'GitHub', url: REPO_URL }
        ]
    };
}

function kindRows(categories: readonly NavigationCategory[]): string {
    const cells = categories.map(({ tone, items }) => {
        const many = getToneTitle(tone).toLowerCase();
        return `${PREVIEW_EMOJI[tone]} ${counted(items.length, tone, many)}`;
    });
    const rows: string[] = [];
    for (let at = 0; at < cells.length; at += KINDS_PER_ROW) rows.push(cells.slice(at, at + KINDS_PER_ROW).join('  '));
    return rows.join('\n');
}

interface PackagePreviewSource {
    entry: PackageCatalogEntry;
    version: PackageVersionCatalog;
    // entry.symbolCounts covers the latest version only
    versionCategories: readonly NavigationCategory[];
    folderUrl: string | undefined;
}

export function packagePreview(source: PackagePreviewSource): PreviewCardProps {
    const { entry, version, versionCategories, folderUrl } = source;
    const page = DocsPage.forPackage(entry, version);
    const latestVersion = latestLink(entry, version, packageLatestPath(entry));
    const npm = `https://www.npmjs.com/package/${entry.manifestName}${latestVersion ? `/v/${version.id}` : ''}`;

    const links: PreviewLink[] = [{ emoji: PREVIEW_EMOJI.npm, label: 'npm', url: npm }];
    if (folderUrl) links.push({ emoji: PREVIEW_EMOJI.github, label: 'Source', url: folderUrl });
    // the Latest link takes this one's space on a phone
    if (!latestVersion && page.markdownUrl) {
        links.push({ emoji: PREVIEW_EMOJI.markdown, label: 'Markdown', url: page.markdownUrl });
    }

    return {
        accent: SITE_ACCENT.docs,
        breadcrumb: latestVersion ? ['docs', 'packages', version.label] : ['docs', 'packages'],
        breadcrumbEmoji: PREVIEW_EMOJI.docs,
        title: entry.manifestName,
        body: entry.description,
        extraText: kindRows(versionCategories),
        links,
        ...(latestVersion ? { latestVersion } : {})
    };
}

// latestPath is undefined when the latest version doesn't have this symbol
export function symbolPreview(resolved: ResolvedEntity, latestPath: string | undefined): PreviewCardProps {
    const { entry, version, entity } = resolved;
    const page = DocsPage.forEntity(entityPath(resolved), entity, version, latestPath);
    const latestVersion = latestLink(entry, version, latestPath ?? packageLatestPath(entry));

    const links: PreviewLink[] = [];
    if (entity.sourceUrl) links.push({ emoji: PREVIEW_EMOJI.github, label: 'Source', url: entity.sourceUrl });
    if (page.markdownUrl) links.push({ emoji: PREVIEW_EMOJI.markdown, label: 'Markdown', url: page.markdownUrl });

    return {
        accent: accentColor(ENTITY_TONE_HEX[entity.kind].dark),
        breadcrumb: ['docs', entry.manifestName, version.label],
        breadcrumbEmoji: PREVIEW_EMOJI.docs,
        title: entity.name,
        titleEmoji: PREVIEW_EMOJI[entity.kind],
        body: page.card.description,
        subtext: entityCounts(entity),
        links,
        ...(latestVersion ? { latestVersion } : {})
    };
}
