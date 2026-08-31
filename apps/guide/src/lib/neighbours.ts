import type { SidebarLink } from '#components/DocsSidebar';

export interface GuidePage extends SidebarLink {
    tab: string;
}

export interface PageNeighbours {
    previous?: GuidePage | undefined;
    next?: GuidePage | undefined;
}

export function neighboursOf(order: readonly GuidePage[], href: string): PageNeighbours {
    const at = order.findIndex((page) => page.href === href);
    if (at === -1) return {};

    return { previous: order[at - 1], next: order[at + 1] };
}
