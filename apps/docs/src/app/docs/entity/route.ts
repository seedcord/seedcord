import { NextResponse, type NextRequest } from 'next/server';

import { loadEntityModel } from '@lib/docs/loadEntityModel';
import { buildEntityHref } from '@lib/docs/routes';

const HTTP_TEMPORARY_REDIRECT = 307;

export async function GET(request: NextRequest): Promise<NextResponse> {
    const url = request.nextUrl;
    const pkg = url.searchParams.get('pkg') ?? url.searchParams.get('package') ?? undefined;
    const slug = url.searchParams.get('slug') ?? undefined;
    const symbol = url.searchParams.get('symbol') ?? undefined;
    const qualifiedName = url.searchParams.get('q') ?? url.searchParams.get('qualifiedName') ?? undefined;
    const kind = url.searchParams.get('kind') ?? undefined;

    const entity = await loadEntityModel({
        ...(pkg ? { pkg } : {}),
        ...(slug ? { slug } : {}),
        ...(symbol ? { symbol } : {}),
        ...(qualifiedName ? { qualifiedName } : {}),
        ...(kind ? { kind } : {})
    });

    if (!entity) {
        const fallbackUrl = new URL('/docs', request.url);
        return NextResponse.redirect(fallbackUrl, HTTP_TEMPORARY_REDIRECT);
    }

    const href = buildEntityHref({
        name: entity.manifestPackage,
        slug: entity.slug,
        version: entity.version ?? null,
        tone: entity.kind
    });

    const destination = new URL(href, request.url);
    return NextResponse.redirect(destination, HTTP_TEMPORARY_REDIRECT);
}
