export interface GuideTab {
    label: string;
    href: string;
}

export const GUIDE_TABS: readonly GuideTab[] = [
    { label: 'Start', href: '/' },
    { label: 'Commands', href: '/commands' },
    { label: 'Replying', href: '/replying' },
    { label: 'Components', href: '/components' },
    { label: 'Events', href: '/events' },
    { label: 'Gates and errors', href: '/gates' },
    { label: 'Plugins', href: '/plugins' },
    { label: 'Tooling', href: '/tooling' }
];
