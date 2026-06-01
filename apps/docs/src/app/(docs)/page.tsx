import { Card, cn } from '@seedcord/ui';

import { InstallCommandTabs } from '@components/docs/InstallCommandTabs';
import { highlightToHtml } from '@lib/shiki';

import type { ReactElement } from 'react';

export const dynamic = 'force-static';

const INSTALL_COMMANDS = [
    {
        id: 'pnpm',
        label: 'pnpm',
        code: 'pnpm add seedcord'
    },
    {
        id: 'npm',
        label: 'npm',
        code: 'npm install seedcord'
    },
    {
        id: 'yarn',
        label: 'yarn',
        code: 'yarn add seedcord'
    }
] as const;

async function DocsIndexPage(): Promise<ReactElement> {
    const highlightedCommands = await Promise.all(
        INSTALL_COMMANDS.map(async (command) => ({
            ...command,
            html: await highlightToHtml(command.code, 'bash')
        }))
    );

    return (
        <section className={cn('space-y-12')}>
            <header className={cn('space-y-4')}>
                <p className={cn('text-subtle text-xs font-semibold tracking-[0.4em] uppercase')}>Getting started</p>
                <h1 className={cn('text-3xl font-semibold text-(--text) sm:text-4xl')}>Install the package</h1>
            </header>

            <Card as="article" size="lg" className={cn('bg-surface space-y-4')}>
                <InstallCommandTabs commands={highlightedCommands} />
            </Card>
        </section>
    );
}

export default DocsIndexPage;
