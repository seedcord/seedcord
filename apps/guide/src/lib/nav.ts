import { getPageTreeRoots } from 'fumadocs-core/page-tree';

import { source } from './source';

import type { SidebarLink, SidebarSection } from '#components/DocsSidebar.tsx';
import type { OrderedPage } from '#lib/neighbours.ts';
import type { Folder, Node, Root } from 'fumadocs-core/page-tree';

export interface GuideTab {
    label: string;
    href: string;
}

type TabRoot = Folder | Root;

// meta.json titles are authored as strings
function text(name: Node['name'] | Root['name']): string | undefined {
    return typeof name === 'string' ? name : undefined;
}

const isOwnTab = (node: Node): boolean => node.type === 'folder' && node.root === true;

function indexUrl(node: TabRoot): string | undefined {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- fumadocs assigns undefined when pagesIndex resolves to nothing
    return 'index' in node && node.index ? node.index.url : undefined;
}

function firstUrl(node: TabRoot): string | undefined {
    const index = indexUrl(node);
    if (index !== undefined) return index;
    for (const child of node.children) {
        if (child.type === 'page') return child.url;
        if (child.type === 'folder') {
            const nested = firstUrl(child);
            if (nested !== undefined) return nested;
        }
    }
    return undefined;
}

// getPageTreeRoots returns the "root": true folders, then the tree itself last
const TAB_ROOTS: readonly TabRoot[] = (() => {
    const roots = getPageTreeRoots(source.pageTree);
    const folders = roots.filter((root): root is Folder => root.type === 'folder');
    return [...roots.filter((root) => root.type !== 'folder'), ...folders];
})();

export const GUIDE_TABS: readonly GuideTab[] = TAB_ROOTS.reduce<GuideTab[]>((tabs, node) => {
    const label = text(node.name);
    const href = firstUrl(node);
    if (label !== undefined && href !== undefined) tabs.push({ label, href });
    return tabs;
}, []);

function pageUrls(node: TabRoot): string[] {
    const index = indexUrl(node);
    const urls = index === undefined ? [] : [index];
    for (const child of node.children) {
        if (child.type === 'page') urls.push(child.url);
        if (child.type === 'folder' && !isOwnTab(child)) urls.push(...pageUrls(child));
    }
    return urls;
}

export const TAB_OF_PAGE: ReadonlyMap<string, string> = new Map(
    TAB_ROOTS.flatMap((node) => {
        const tab = text(node.name);
        return tab === undefined ? [] : pageUrls(node).map((url): [string, string] => [url, tab]);
    })
);

interface DraftSection {
    label?: string | undefined;
    links: SidebarLink[];
}

function sectionsOf(node: TabRoot): readonly SidebarSection[] {
    const drafts: DraftSection[] = [{ links: [] }];

    for (const child of node.children) {
        if (child.type === 'separator') {
            drafts.push({ label: text(child.name), links: [] });
            continue;
        }
        if (isOwnTab(child)) continue;

        const label = text(child.name);
        const href = child.type === 'page' ? child.url : firstUrl(child);
        const current = drafts[drafts.length - 1];
        if (label !== undefined && href !== undefined && current) current.links.push({ label, href });
    }

    return drafts.filter((draft) => draft.links.length > 0);
}

export function guideOrder(): readonly OrderedPage[] {
    return TAB_ROOTS.reduce<OrderedPage[]>((order, node) => {
        const tab = text(node.name);
        if (tab === undefined) return order;

        for (const section of sectionsOf(node)) {
            for (const link of section.links) order.push({ ...link, tab, group: section.label });
        }
        return order;
    }, []);
}

export type SidebarsByTab = Readonly<Record<string, readonly SidebarSection[]>>;

// a next layout gets no pathname
export function sidebarsByTab(): SidebarsByTab {
    return TAB_ROOTS.reduce<Record<string, readonly SidebarSection[]>>((byTab, node) => {
        const href = firstUrl(node);
        if (href !== undefined) byTab[href] = sectionsOf(node);
        return byTab;
    }, {});
}
