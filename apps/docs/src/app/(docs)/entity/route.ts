import { buildEntityHref, buildPackageBasePath, resolvePackageIdentity } from '@seedcord/docs-engine';
import { NextResponse, type NextRequest } from 'next/server';

import { getDocsEngine } from '@lib/docs/engine';
import { loadEntityModel } from '@lib/docs/loadEntityModel';

const HTTP_TEMPORARY_REDIRECT = 307;

interface EntityQuery {
    pkg: string | null;
    lookup: { slug?: string; symbol?: string; qualifiedName?: string; kind?: string };
}

function readEntityQuery(params: URLSearchParams): EntityQuery {
    const get = (key: string): string | undefined => params.get(key) ?? undefined;
    const slug = get('slug');
    const symbol = get('symbol');
    const qualifiedName = get('q') ?? get('qualifiedName');
    const kind = get('kind');

    return {
        pkg: params.get('pkg') ?? params.get('package'),
        lookup: {
            ...(slug ? { slug } : {}),
            ...(symbol ? { symbol } : {}),
            ...(qualifiedName ? { qualifiedName } : {}),
            ...(kind ? { kind } : {})
        }
    };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
    const { pkg, lookup } = readEntityQuery(request.nextUrl.searchParams);
    const redirect = (target: string | URL): NextResponse =>
        NextResponse.redirect(new URL(target, request.url), HTTP_TEMPORARY_REDIRECT);
    const homeFallback = (): NextResponse => redirect('/');

    const engine = await getDocsEngine();
    const identity = resolvePackageIdentity(await engine.listPackages(), pkg);
    if (!identity) {
        return homeFallback();
    }

    try {
        await engine.setVersion(identity.folder, 'latest');
    } catch {
        return homeFallback();
    }

    const entity = await loadEntityModel(engine, identity.fullName, lookup);
    if (!entity) {
        // this lands on the package index with a moved flag
        const movedSlug = lookup.slug ?? lookup.symbol ?? lookup.qualifiedName ?? '';
        const base = new URL(
            buildPackageBasePath(identity.fullName, engine.activeVersion(identity.fullName)),
            request.url
        );
        if (movedSlug) base.searchParams.set('moved', movedSlug);
        return redirect(base);
    }

    const href = buildEntityHref({
        name: entity.manifestPackage,
        slug: entity.slug,
        version: entity.version ?? null,
        tone: entity.kind
    });

    return redirect(href);
}
