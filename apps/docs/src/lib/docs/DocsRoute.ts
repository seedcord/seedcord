import { DEFAULT_VERSION } from '@seedcord/docs-engine/client';

import { ActiveVersion } from '#lib/docs/ActiveVersion';
import { loadDocsCatalog } from '#lib/docs/catalog';
import { getDocsEngine } from '#lib/docs/engine';

const ROOT = 'packages';

// only a type alias fits PageParams' index signature
type VersionParams = { packageId: string; versionId: string };
type EntityParams = VersionParams & { entitySegments: string[] };

export class DocsRoute {
    constructor(
        public readonly packageId: string,
        public readonly versionId: string,
        public readonly entitySegments: string[] = []
    ) {}

    static parse(segments: readonly string[]): DocsRoute | undefined {
        const [root, packageId, versionId, ...entitySegments] = segments;
        if (root !== ROOT || !packageId || !versionId) return undefined;
        return new DocsRoute(packageId, versionId, entitySegments);
    }

    get isLatest(): boolean {
        return this.versionId === DEFAULT_VERSION;
    }

    get isOverview(): boolean {
        return this.entitySegments.length === 0;
    }

    get segments(): string[] {
        return [ROOT, this.packageId, this.versionId, ...this.entitySegments];
    }

    get path(): string {
        return `/${this.segments.map((segment) => encodeURIComponent(segment)).join('/')}`;
    }

    get params(): EntityParams {
        return { packageId: this.packageId, versionId: this.versionId, entitySegments: this.entitySegments };
    }
}

export async function docsRoutes(): Promise<DocsRoute[]> {
    const [catalog, engine] = await Promise.all([loadDocsCatalog(), getDocsEngine()]);
    const routes: DocsRoute[] = [];

    // setVersion mutates the engine. keep this loop sequential
    for (const entry of catalog) {
        routes.push(new DocsRoute(entry.id, DEFAULT_VERSION));
        for (const version of entry.versions) {
            routes.push(new DocsRoute(entry.id, version.id));

            const active = await ActiveVersion.open(engine, entry.id, version.id);
            for (const page of active?.pages ?? []) {
                // a re-export is listed under the package that declares it
                if (!page.href.startsWith(`${version.basePath}/`)) continue;

                const entitySegments = page.href
                    .slice(version.basePath.length + 1)
                    .split('/')
                    .map((segment) => decodeURIComponent(segment));
                routes.push(new DocsRoute(entry.id, version.id, entitySegments));
                if (version.isLatest) routes.push(new DocsRoute(entry.id, DEFAULT_VERSION, entitySegments));
            }
        }
    }

    return routes;
}

export async function overviewParams(): Promise<VersionParams[]> {
    return (await docsRoutes()).reduce<VersionParams[]>((params, { isOverview, packageId, versionId }) => {
        if (isOverview) params.push({ packageId, versionId });
        return params;
    }, []);
}

export async function entityParams(): Promise<EntityParams[]> {
    return (await docsRoutes()).reduce<EntityParams[]>((params, route) => {
        if (!route.isOverview) params.push(route.params);
        return params;
    }, []);
}
