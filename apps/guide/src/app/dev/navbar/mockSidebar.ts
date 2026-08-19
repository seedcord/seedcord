import type { GuideTab } from '#lib/tabs';

export interface MockSidebarSection {
    label?: string;
    links: readonly GuideTab[];
}

export const MOCK_SIDEBAR_BY_TAB: Readonly<Record<string, readonly MockSidebarSection[]>> = {
    '/commands': [
        {
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
    ],
    // the stress case, 18 pages over 4 sections
    '/tooling': [
        {
            label: 'Logging',
            links: [
                { label: 'Logging from a handler', href: '/tooling/logging' },
                { label: 'Levels and channels', href: '/tooling/levels' },
                { label: 'The dev terminal', href: '/tooling/dev-terminal' },
                { label: 'Configuring the logger', href: '/tooling/logger-config' }
            ]
        },
        {
            label: 'The dev loop and the CLI',
            links: [
                { label: 'Hot reload against restart', href: '/tooling/hot-reload' },
                { label: 'Type checking while you work', href: '/tooling/typecheck-watch' },
                { label: 'Typed emojis', href: '/tooling/emojis' },
                { label: 'Clickable command mentions', href: '/tooling/command-mentions' },
                { label: 'Cleaning up deployed commands', href: '/tooling/command-cleanup' }
            ]
        },
        {
            label: 'Going to production',
            links: [
                { label: 'Building for production', href: '/tooling/build' },
                { label: 'Deploying a long-running bot', href: '/tooling/deploy' },
                { label: 'Production checklist', href: '/tooling/checklist' },
                { label: 'Lint rules for a seedcord project', href: '/tooling/lint-rules' }
            ]
        },
        {
            label: 'Reference paths and escape hatches',
            links: [
                { label: 'Reaching the raw discord.js client', href: '/tooling/raw-client' },
                { label: 'Testing your commands and handlers', href: '/tooling/testing' },
                { label: 'Localizing command names and descriptions', href: '/tooling/localization' },
                { label: 'Renaming or removing a command, emoji, or plugin key', href: '/tooling/renaming' },
                { label: 'Error message index', href: '/tooling/error-index' }
            ]
        }
    ]
};
