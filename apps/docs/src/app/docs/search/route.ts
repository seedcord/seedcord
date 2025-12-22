import { kindName, type DocSearchEntry, type DocNode } from '@seedcord/docs-engine';
import { NextResponse, type NextRequest } from 'next/server';

import { getDocsEngine } from '@lib/docs/engine';
import { DEFAULT_MANIFEST_PACKAGE, resolveManifestPackageName } from '@lib/docs/packages';
import { buildEntityHref, buildPackageBasePath } from '@lib/docs/routes';

const MAX_RESULTS = 24;
const MIN_QUERY_LENGTH = 3;

type SearchResultKind =
    | 'class'
    | 'interface'
    | 'type'
    | 'enum'
    | 'function'
    | 'variable'
    | 'constructor'
    | 'method'
    | 'property'
    | 'parameter'
    | 'typeParameter'
    | 'enumMember'
    | 'page';

interface CommandActionPayload {
    id: string;
    label: string;
    path: string;
    href: string;
    kind: SearchResultKind;
    description?: string;
}

interface SearchResponse {
    results: CommandActionPayload[];
}

const KIND_TO_RESULT = new Map<string, SearchResultKind>([
    ['class', 'class'],
    ['interface', 'interface'],
    ['enum', 'enum'],
    ['enumMember', 'enumMember'],
    ['typeAlias', 'type'],
    ['typeParameter', 'typeParameter'],
    ['function', 'function'],
    ['method', 'method'],
    ['constructor', 'constructor'],
    ['callSignature', 'function'],
    ['constructorSignature', 'constructor'],
    ['getSignature', 'property'],
    ['setSignature', 'property'],
    ['accessor', 'property'],
    ['property', 'property'],
    ['variable', 'variable'],
    ['parameter', 'parameter']
]);

const getResultKind = (kind: number): SearchResultKind => {
    const key = kindName(kind);
    return KIND_TO_RESULT.get(key) ?? 'page';
};

const encodeSlug = (slug: string): string =>
    slug
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');

const buildBreadcrumb = (entry: DocSearchEntry): string => {
    const versionLabel = entry.packageVersion ? `@${entry.packageVersion}` : undefined;
    const qualifiedLabel = entry.qualifiedName && entry.qualifiedName !== entry.name ? entry.qualifiedName : undefined;

    const baseLabel = versionLabel ? `${entry.packageName}${versionLabel}` : entry.packageName;
    const parts = [baseLabel];

    if (qualifiedLabel) {
        parts.push(qualifiedLabel);
    } else {
        parts.push(entry.slug);
    }

    return parts.filter(Boolean).join(' · ');
};

const ENTITY_RESULT_KINDS = new Set<SearchResultKind>(['class', 'interface', 'enum', 'type', 'function', 'variable']);

const MEMBER_ANCHOR_PREFIX: Partial<Record<SearchResultKind, string>> = {
    method: 'method',
    property: 'property',
    constructor: 'constructor',
    typeParameter: 'typeParameter',
    enumMember: 'enum-member'
};

const getParentSlug = (slug: string): string | null => {
    const segments = slug.split('/');
    if (segments.length <= 1) {
        return null;
    }
    return segments.slice(0, -1).join('/');
};

const findEntityNode = (engine: Awaited<ReturnType<typeof getDocsEngine>>, entry: DocSearchEntry): DocNode | null => {
    const segments = entry.slug.split('/');

    for (let index = segments.length; index > 0; index -= 1) {
        const candidateSlug = segments.slice(0, index).join('/');
        const candidate = engine.getNodeByGlobalSlug(entry.packageName, candidateSlug);
        if (!candidate) {
            continue;
        }

        const normalizedKind = kindName(candidate.kind).toLowerCase();
        if (ENTITY_RESULT_KINDS.has(normalizedKind as SearchResultKind)) {
            return candidate;
        }
    }

    return null;
};

const buildEntityUrl = (node: DocNode, fallbackVersion: string | null): string =>
    buildEntityHref({
        name: node.sourcePackage.name,
        slug: node.slug,
        version: node.packageVersion ?? fallbackVersion,
        tone: kindName(node.kind)
    });

const createBasePayload = (entry: DocSearchEntry, kind: SearchResultKind): CommandActionPayload => {
    const payload: CommandActionPayload = {
        id: `${entry.packageName}:${entry.slug}:${entry.kind}`,
        label: entry.name,
        path: buildBreadcrumb(entry),
        href: '',
        kind
    } satisfies CommandActionPayload;

    if (entry.summary) {
        payload.description = entry.summary;
    }

    return payload;
};

const buildPageHref = (entry: DocSearchEntry, version: string | null): string => {
    const basePath = buildPackageBasePath(entry.packageName, version);
    return `${basePath}/${encodeSlug(entry.slug)}`;
};

const buildParameterHref = (
    engine: Awaited<ReturnType<typeof getDocsEngine>>,
    entry: DocSearchEntry,
    entityHref: string
): string => {
    const parentSlug = getParentSlug(entry.slug);
    if (!parentSlug) {
        return entityHref;
    }

    const parentNode = engine.getNodeByGlobalSlug(entry.packageName, parentSlug);
    const parentKind = parentNode ? kindName(parentNode.kind).toLowerCase() : '';
    const prefix = parentKind === 'constructor' ? 'constructor' : 'method';

    return `${entityHref}#${prefix}-${parentSlug}`;
};

const buildMemberHref = (
    engine: Awaited<ReturnType<typeof getDocsEngine>>,
    entry: DocSearchEntry,
    resultKind: SearchResultKind,
    entityNode: DocNode,
    version: string | null
): string => {
    const entityHref = buildEntityUrl(entityNode, version);

    if (resultKind === 'parameter') {
        return buildParameterHref(engine, entry, entityHref);
    }

    const anchorPrefix = MEMBER_ANCHOR_PREFIX[resultKind];
    return anchorPrefix ? `${entityHref}#${anchorPrefix}-${entry.slug}` : entityHref;
};

const mapSearchEntry = (
    engine: Awaited<ReturnType<typeof getDocsEngine>>,
    entry: DocSearchEntry
): CommandActionPayload | null => {
    if (!entry.slug) {
        return null;
    }

    const version = entry.packageVersion ?? null;
    const resultKind = getResultKind(entry.kind);
    const payload = createBasePayload(entry, resultKind);

    if (ENTITY_RESULT_KINDS.has(resultKind)) {
        const node =
            engine.getNodeByGlobalSlug(entry.packageName, entry.slug) ??
            engine.getNodeBySlug(entry.packageName, entry.slug);

        const name = node ? node.sourcePackage.name : entry.packageName;
        const version = node ? node.sourcePackage.version : (entry.packageVersion ?? null);

        payload.href = buildEntityHref({
            name: name,
            slug: entry.slug,
            version,
            tone: resultKind
        });

        return payload;
    }

    if (resultKind === 'page') {
        payload.href = buildPageHref(entry, version);
        return payload;
    }

    const entityNode = findEntityNode(engine, entry);
    if (!entityNode) {
        payload.href = buildPageHref(entry, version);
        return payload;
    }

    payload.href = buildMemberHref(engine, entry, resultKind, entityNode, version);
    return payload;
};

export async function GET(request: NextRequest): Promise<NextResponse<SearchResponse>> {
    const url = request.nextUrl;
    const rawQuery = url.searchParams.get('q') ?? '';
    const query = rawQuery.trim();

    if (query.length < MIN_QUERY_LENGTH) {
        return NextResponse.json({ results: [] });
    }

    const engine = await getDocsEngine();
    const pkgParam = url.searchParams.get('pkg');
    const manifestPackage = pkgParam ? resolveManifestPackageName(engine, pkgParam) : undefined;
    const rawResults = engine.search(query, manifestPackage);

    const grouped = new Map<string, DocSearchEntry[]>();
    for (const entry of rawResults) {
        const key = `${entry.slug}::${getResultKind(entry.kind)}`;
        const list = grouped.get(key) ?? [];
        list.push(entry);
        grouped.set(key, list);
    }

    const filteredEntries: DocSearchEntry[] = [];
    for (const [, group] of grouped) {
        const preferred = group.find((e) => e.packageName === DEFAULT_MANIFEST_PACKAGE) ?? group[0];
        if (preferred) filteredEntries.push(preferred);
        if (filteredEntries.length >= MAX_RESULTS) break;
    }

    const payload = filteredEntries
        .map((entry) => mapSearchEntry(engine, entry))
        .filter((entry): entry is CommandActionPayload => entry !== null)
        .slice(0, MAX_RESULTS);

    return NextResponse.json({ results: payload });
}
