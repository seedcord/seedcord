import { kindName, type DocSearchEntry, type DocNode } from '@seedcord/docs-engine';
import {
    memberFragment,
    DEFAULT_VERSION,
    formatDisplayPackageName,
    resolvePackageIdentity,
    buildEntityHref,
    buildPackageBasePath
} from '@seedcord/docs-engine';
import { NextResponse, type NextRequest } from 'next/server';

import { MIN_SEARCH_QUERY_LENGTH } from '@components/search/command-palette/constants';
import { getDocsEngine } from '@lib/docs/engine';
import { checkSearchRateLimit } from '@lib/searchRateLimit';

const MAX_RESULTS = 24;

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
    value?: string;
}

interface SearchPayload {
    results: CommandActionPayload[];
}

interface PackagesPayload {
    packages: { folder: string; label: string }[];
}

type KindFilter = 'all' | 'class' | 'interface' | 'type' | 'enum' | 'function' | 'variable' | 'member';

const MEMBER_RESULT_KINDS = new Set<SearchResultKind>([
    'constructor',
    'method',
    'property',
    'parameter',
    'typeParameter',
    'enumMember'
]);

function matchesKind(resultKind: SearchResultKind, filter: KindFilter): boolean {
    if (filter === 'all') return true;
    if (filter === 'member') return MEMBER_RESULT_KINDS.has(resultKind);
    return resultKind === filter;
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

function getResultKind(kind: number): SearchResultKind {
    const key = kindName(kind);
    return KIND_TO_RESULT.get(key) ?? 'page';
}

const encodeSlug = (slug: string): string =>
    slug
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');

function buildBreadcrumb(entry: DocSearchEntry): string {
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
}

const ENTITY_RESULT_KINDS = new Set<SearchResultKind>(['class', 'interface', 'enum', 'type', 'function', 'variable']);

function getParentSlug(slug: string): string | null {
    const segments = slug.split('/');
    if (segments.length <= 1) {
        return null;
    }
    return segments.slice(0, -1).join('/');
}

function findEntityNode(engine: Awaited<ReturnType<typeof getDocsEngine>>, entry: DocSearchEntry): DocNode | null {
    const segments = entry.slug.split('/');

    for (let index = segments.length; index > 0; index -= 1) {
        const candidateSlug = segments.slice(0, index).join('/');
        const candidate = engine.getNodeByGlobalSlug(entry.packageName, candidateSlug);
        if (!candidate) {
            continue;
        }

        const resultKind = getResultKind(candidate.kind);
        if (ENTITY_RESULT_KINDS.has(resultKind)) {
            return candidate;
        }
    }

    return null;
}

const buildEntityUrl = (node: DocNode, fallbackVersion: string | null): string =>
    buildEntityHref({
        name: node.sourcePackage.name,
        slug: node.slug,
        version: node.packageVersion ?? fallbackVersion,
        tone: kindName(node.kind)
    });

function createBasePayload(entry: DocSearchEntry, kind: SearchResultKind): CommandActionPayload {
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

    if (entry.value) {
        payload.value = entry.value;
    }

    return payload;
}

function buildPageHref(entry: DocSearchEntry, version: string | null): string {
    const basePath = buildPackageBasePath(entry.packageName, version);
    return `${basePath}/${encodeSlug(entry.slug)}`;
}

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
    if (!parentNode) {
        return entityHref;
    }

    return `${entityHref}#${memberFragment(parentNode)}`;
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

    const memberNode = engine.getNodeByGlobalSlug(entry.packageName, entry.slug);
    return memberNode ? `${entityHref}#${memberFragment(memberNode)}` : entityHref;
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

function dedupe(rawResults: DocSearchEntry[], kind: KindFilter): DocSearchEntry[] {
    // a member's overload signatures share slug and kind. a same-named entity in another package,
    // like Logger in seedcord and services, stays a distinct result
    const seen = new Set<string>();
    const out: DocSearchEntry[] = [];
    for (const entry of rawResults) {
        const resultKind = getResultKind(entry.kind);
        if (!matchesKind(resultKind, kind)) continue;
        const key = `${entry.packageName}::${entry.slug}::${resultKind}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(entry);
        if (out.length >= MAX_RESULTS) break;
    }
    return out;
}

// the current package is searched at its URL version, keeping older versions searchable. other
// packages follow the toggle, stable heads when off and pre-release heads when on
async function loadSearchTargets(
    engine: Awaited<ReturnType<typeof getDocsEngine>>,
    targets: readonly { folder: string }[],
    currentFolder: string,
    version: string,
    prerelease: boolean
): Promise<void> {
    for (const pkg of targets) {
        if (pkg.folder === currentFolder) {
            await engine.setVersion(pkg.folder, version).catch(() => undefined);
            continue;
        }
        const entry = await engine.getEntry(pkg.folder);
        // prefer the toggled channel, falling back to the other since every package on the next
        // branch ships pre-release only. it would otherwise vanish from search
        const channel = prerelease ? (entry?.prerelease ?? entry?.stable) : (entry?.stable ?? entry?.prerelease);
        if (!channel) continue;
        await engine.setVersion(pkg.folder, channel.latest).catch(() => undefined);
    }
}

export async function GET(request: NextRequest): Promise<NextResponse<SearchPayload | PackagesPayload>> {
    const rateLimit = await checkSearchRateLimit(request);
    if (rateLimit.limited) {
        return NextResponse.json(
            { results: [] },
            { status: 429, headers: { 'Retry-After': String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
        );
    }

    const url = request.nextUrl;
    const engine = await getDocsEngine();
    const packages = await engine.listPackages();

    if (url.searchParams.get('list') === 'packages') {
        return NextResponse.json({
            packages: packages.map((pkg) => ({ folder: pkg.folder, label: formatDisplayPackageName(pkg.fullName) }))
        });
    }

    const startedAt = performance.now();
    const query = (url.searchParams.get('q') ?? '').trim();
    const current = resolvePackageIdentity(packages, url.searchParams.get('pkg'));
    if (query.length < MIN_SEARCH_QUERY_LENGTH || !current) {
        return NextResponse.json({ results: [] });
    }

    const scopeParam = url.searchParams.get('scope') ?? 'all';
    const scoped = scopeParam === 'all' ? null : resolvePackageIdentity(packages, scopeParam);
    const kind = (url.searchParams.get('kind') ?? 'all') as KindFilter;
    const version = url.searchParams.get('version') ?? DEFAULT_VERSION;
    const prerelease = url.searchParams.get('prerelease') === '1';

    const targets = scoped ? packages.filter((pkg) => pkg.folder === scoped.folder) : packages;
    await loadSearchTargets(engine, targets, current.folder, version, prerelease);

    const rawResults = scoped ? engine.search(query, scoped.fullName) : engine.search(query);
    const results = dedupe(rawResults, kind)
        .map((entry) => mapSearchEntry(engine, entry))
        .filter((entry): entry is CommandActionPayload => entry !== null);

    const response = NextResponse.json({ results });
    response.headers.set('Server-Timing', `search;dur=${(performance.now() - startedAt).toFixed(1)}`);
    return response;
}
