import { buildPackageBasePath, DEFAULT_VERSION } from '@seedcord/docs-engine/client';

import { plainSummary } from '#lib/docs/plainSummary';
import { SITE_NAME, canonicalUrl } from '#lib/site';

import type { ResolvedEntity } from '#lib/docs/resolveEntity';

export function entityPath({ entry, version, segments }: ResolvedEntity): string {
    return `${buildPackageBasePath(entry.manifestName, version.id)}/${segments.join('/')}`;
}

export function entityJsonLd(resolved: ResolvedEntity, latestPath?: string): Record<string, unknown> {
    const { entry, version, entity } = resolved;
    const url = canonicalUrl(latestPath ?? entityPath(resolved));
    const overviewUrl = canonicalUrl(
        buildPackageBasePath(entry.manifestName, latestPath === undefined ? version.id : DEFAULT_VERSION)
    );
    const summary = plainSummary(entity.summary[0]?.plain ?? '');

    return {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'APIReference',
                '@id': `${url}#api`,
                name: entity.name,
                ...(summary ? { description: summary } : {}),
                url,
                programmingLanguage: 'TypeScript',
                executableLibraryName: entity.displayPackage,
                assemblyVersion: version.id,
                isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: canonicalUrl('/') }
            },
            {
                '@type': 'BreadcrumbList',
                '@id': `${url}#breadcrumb`,
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Docs', item: canonicalUrl('/') },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: `${entity.displayPackage} ${version.label}`,
                        item: overviewUrl
                    },
                    { '@type': 'ListItem', position: 3, name: entity.name, item: url }
                ]
            }
        ]
    };
}
