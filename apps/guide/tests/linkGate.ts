import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { slugifySegment } from '@seedcord/docs-engine/client';
import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import { remarkHeading } from 'fumadocs-core/mdx-plugins/remark-heading';
import remarkMdx from 'remark-mdx';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { redirectFor } from '#lib/redirects';

import type { Nodes, Root } from 'mdast';

interface GuideSite {
    sources: ReadonlyMap<string, string>;
    anchors: ReadonlyMap<string, ReadonlySet<string>>;
    files: ReadonlySet<string>;
    symbolSlugsByPackage: ReadonlyMap<string, ReadonlySet<string>>;
}

interface Target {
    url: string;
    line: number;
}

const GUIDE_ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT_DIR = path.join(GUIDE_ROOT, 'content/docs');
const PUBLIC_DIR = path.join(GUIDE_ROOT, 'public');
// pnpm docs:local writes these from this checkout. a symbol that isn't published yet passes here
const ARTIFACTS_DIR = path.resolve(GUIDE_ROOT, '../../generated/artifacts');

const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;
const TWIN_EXTENSION = '.md';

const processor = unified().use(remarkParse).use(remarkMdx).use(remarkGfm).use(remarkHeading, { generateToc: false });

function routeOf(file: string): string {
    const route = `/${file.replace(/\.mdx$/, '')}`.replace(/\/index$/, '');
    return route === '' ? '/' : route;
}

async function readGuidePages(): Promise<Map<string, string>> {
    const files = (await readdir(CONTENT_DIR, { recursive: true })).filter((file) => file.endsWith('.mdx'));
    const pages = await Promise.all(
        files.map(async (file) => [routeOf(file), await readFile(path.join(CONTENT_DIR, file), 'utf8')] as const)
    );
    return new Map(pages);
}

// blank lines keep every line number the same as in the file
function parse(source: string): Root {
    const body = source.replace(FRONTMATTER, (frontmatter) => '\n'.repeat(frontmatter.split('\n').length - 1));
    return processor.runSync(processor.parse(body));
}

function children(node: Nodes): Nodes[] {
    return 'children' in node ? node.children : [];
}

function anchorsOf(tree: Root): Set<string> {
    const anchors = new Set<string>();
    const visit = (node: Nodes): void => {
        const id = node.type === 'heading' ? node.data?.hProperties?.id : undefined;
        if (typeof id === 'string') anchors.add(id);
        children(node).forEach(visit);
    };
    visit(tree);
    return anchors;
}

function targetsOf(tree: Root): Target[] {
    const targets: Target[] = [];
    const visit = (node: Nodes): void => {
        if (node.type === 'link' || node.type === 'image' || node.type === 'definition') {
            targets.push({ url: node.url, line: node.position?.start.line ?? 0 });
        }
        children(node).forEach(visit);
    };
    visit(tree);
    return targets;
}

export function siteFrom(input: {
    pages: Record<string, string>;
    files: readonly string[];
    symbols: Record<string, readonly string[]>;
}): GuideSite {
    const sources = new Map(Object.entries(input.pages));
    return {
        sources,
        anchors: new Map([...sources].map(([route, source]) => [route, anchorsOf(parse(source))] as const)),
        files: new Set(input.files),
        symbolSlugsByPackage: new Map(
            Object.entries(input.symbols).map(([pkg, slugs]) => [pkg, new Set(slugs)] as const)
        )
    };
}

function withoutTrailingSlash(route: string): string {
    return route.length > 1 && route.endsWith('/') ? route.slice(0, -1) : route;
}

function pageProblem(site: GuideSite, route: string, url: string): string | null {
    const hashAt = url.indexOf('#');
    const pathPart = hashAt === -1 ? url : url.slice(0, hashAt);
    const anchor = hashAt === -1 ? '' : url.slice(hashAt + 1);
    const target = pathPart === '' ? route : withoutTrailingSlash(pathPart);

    const moved = redirectFor(target);
    if (moved !== undefined) return `moved to ${moved}`;

    if (target.endsWith(TWIN_EXTENSION)) {
        const page = target.slice(0, -TWIN_EXTENSION.length);
        return site.sources.has(page === '/index' ? '/' : page) ? null : 'is the twin of a page that does not exist';
    }
    if (path.extname(target) !== '') return site.files.has(target) ? null : 'is not a file in public/';

    const anchors = site.anchors.get(target);
    if (anchors === undefined) return 'is not a guide page';
    if (anchor !== '' && !anchors.has(anchor)) return `has no heading with the id ${anchor}`;
    return null;
}

function refProblem(site: GuideSite, url: string): string | null {
    const [pkg = '', symbol = ''] = url.slice('ref:'.length).split('/');
    const slugs = site.symbolSlugsByPackage.get(pkg);
    if (slugs === undefined) return 'points at a package the reference site does not list';
    if (symbol === '') return null;

    const [owner = ''] = symbol.split(/[.#]/);
    return slugs.has(slugifySegment(owner)) ? null : `is not a symbol the reference site documents for ${pkg}`;
}

function problemWith(site: GuideSite, route: string, url: string): string | null {
    if (url.startsWith('ref:')) return refProblem(site, url);
    if (url.startsWith('#') || (url.startsWith('/') && !url.startsWith('//'))) return pageProblem(site, route, url);
    return null;
}

export function brokenLinks(site: GuideSite, route: string, source: string): string[] {
    return targetsOf(parse(source)).reduce<string[]>((problems, { url, line }) => {
        const problem = problemWith(site, route, url);
        if (problem !== null) problems.push(`${route}:${line} ${url} ${problem}`);
        return problems;
    }, []);
}

interface ArtifactIndex {
    pathTemplates: { stable: string; prerelease: string };
    packages: Record<string, { stable: { latest: string } | null; prerelease: { latest: string } | null }>;
}

interface ProjectFile {
    root: { children: { slug: string }[] };
}

async function readJson<T>(file: string): Promise<T> {
    try {
        return JSON.parse(await readFile(file, 'utf8')) as T;
    } catch (error) {
        throw new Error(`the link gate reads ${file}. Run pnpm docs:local from the repo root first.`, { cause: error });
    }
}

// /latest on the reference site serves the stable head, or the prerelease head before a stable release
async function readSymbols(): Promise<Record<string, string[]>> {
    const index = await readJson<ArtifactIndex>(path.join(ARTIFACTS_DIR, 'index.json'));
    const entries = await Promise.all(
        Object.entries(index.packages).map(async ([folder, { stable, prerelease }]) => {
            const channel = stable ? 'stable' : 'prerelease';
            const version = stable?.latest ?? prerelease?.latest ?? '';
            const relative = index.pathTemplates[channel].replace('{name}', folder).replace('{version}', version);
            const project = await readJson<ProjectFile>(path.join(ARTIFACTS_DIR, relative));
            return [folder, project.root.children.map((child) => child.slug)] as const;
        })
    );
    return Object.fromEntries(entries);
}

export async function loadGuideSite(): Promise<GuideSite> {
    const [pages, publicFiles, symbols] = await Promise.all([
        readGuidePages(),
        readdir(PUBLIC_DIR, { recursive: true }),
        readSymbols()
    ]);

    return siteFrom({ pages: Object.fromEntries(pages), files: publicFiles.map((file) => `/${file}`), symbols });
}
