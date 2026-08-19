export interface MockSidebarLink {
    label: string;
    href: string;
}

export interface MockSidebarSection {
    label: string;
    links: readonly MockSidebarLink[];
}

export const MOCK_SIDEBAR_BY_TAB: Readonly<Record<string, readonly MockSidebarSection[]>> = {
    '/commands': [
        {
            label: 'Commands',
            links: [
                { label: 'Declaring a command', href: '/commands/declaring' },
                { label: 'Options that type themselves', href: '/commands/options' },
                { label: 'Choices and channel types', href: '/commands/choices' },
                { label: 'Subcommands and groups', href: '/commands/subcommands' },
                { label: 'Autocomplete', href: '/commands/autocomplete' },
                { label: 'Context menu commands', href: '/commands/context-menus' },
                { label: 'Getting commands to Discord', href: '/commands/deploying' }
            ]
        }
    ],
    '/gates': [
        {
            label: 'Gates',
            links: [
                { label: 'What a gate is', href: '/gates/what-a-gate-is' },
                { label: 'The gates that ship', href: '/gates/catalog' },
                { label: 'Wording a refusal', href: '/gates/refusals' },
                { label: 'Combining gates', href: '/gates/combining' },
                { label: 'Writing your own', href: '/gates/custom' }
            ]
        },
        {
            label: 'Errors',
            links: [
                { label: 'Notice, Fault, Silence', href: '/gates/error-kinds' },
                { label: 'Reporting to a channel', href: '/gates/reporting' }
            ]
        },
        {
            label: 'Rate limits',
            links: [{ label: 'Cooldown a command', href: '/gates/cooldown' }]
        }
    ]
};
