import { Card, cn } from '@seedcord/ui';

import { InstallCommandTabs } from '@components/docs/InstallCommandTabs';
import { Container } from '@components/layout/sidebar/utils/container/Container';
import { loadActiveVersion, loadDocsCatalog, withActiveCategories } from '@lib/docs/catalog';
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
    const [highlightedCommands, catalog] = await Promise.all([
        Promise.all(
            INSTALL_COMMANDS.map(async (command) => ({
                ...command,
                html: await highlightToHtml(command.code, 'bash')
            }))
        ),
        loadDocsCatalog()
    ]);

    // The landing URL carries no package; default the sidebar to the first package's latest so the
    // picker stays reachable here.
    const entry = catalog[0] ?? null;
    const version = entry
        ? (entry.versions.find((candidate) => candidate.isLatest) ?? entry.versions[0] ?? null)
        : null;
    const catalogForRender =
        entry && version
            ? withActiveCategories(catalog, entry.id, version.id, await loadActiveVersion(entry.id, version.id))
            : catalog;

    return (
        <Container catalog={catalogForRender} activePackageId={entry?.id ?? ''} activeVersionId={version?.id ?? ''}>
            <main id="main-content" className={cn('min-w-0')}>
                <section className={cn('space-y-12')}>
                    <header className={cn('space-y-4')}>
                        <p className={cn('text-subtle text-xs font-semibold tracking-[0.4em] uppercase')}>
                            Getting started
                        </p>
                        <h1 className={cn('text-3xl font-semibold text-(--text) sm:text-4xl')}>Install the package</h1>
                    </header>

                    <Card as="article" size="lg" className={cn('bg-surface space-y-4')}>
                        <InstallCommandTabs commands={highlightedCommands} />
                    </Card>
                </section>
            </main>
        </Container>
    );
}

export default DocsIndexPage;
