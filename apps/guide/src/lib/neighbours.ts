import type { SidebarLink } from '#components/DocsSidebar';

export interface OrderedPage extends SidebarLink {
    tab: string;
    group?: string | undefined;
}

export interface PageNeighbours {
    previous?: OrderedPage | undefined;
    next?: OrderedPage | undefined;
}

export function neighboursOf(order: readonly OrderedPage[], href: string): PageNeighbours {
    const at = order.findIndex((page) => page.href === href);
    if (at === -1) return {};

    return { previous: order[at - 1], next: order[at + 1] };
}
