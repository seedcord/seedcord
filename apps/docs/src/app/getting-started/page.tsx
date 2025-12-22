import type { ReactElement } from 'react';

export const dynamic = 'force-static';

function GettingStartedPage(): ReactElement {
    return (
        <article className="card bg-surface shadow-soft space-y-5 p-5">
            <header className="space-y-2">
                <h1 className="text-3xl font-semibold text-(--text)">Getting started</h1>
                <p className="text-subtle text-sm">
                    Placeholder content for the onboarding guide. TODO: replace with real quickstart sourced from
                    markdown/TypeDoc.
                </p>
            </header>
            <section className="space-y-4 text-sm leading-6 text-(--text)">
                <p>
                    Welcome to the Seedcord docs prototype. This page will eventually walk through installation,
                    bootstrapping the CLI, and running your first bot. For now, explore the interactive controls
                    throughout the layout to get a feel for the experience.
                </p>
                <ul className="text-subtle list-disc space-y-2 pl-6">
                    <li>Use the theme toggle to preview light and dark styles.</li>
                    <li>Press ⌘K / Ctrl+K for the command palette, then enter to log a selection.</li>
                    <li>Switch packages and versions via the header dropdowns to update shared state.</li>
                </ul>
                <p className="text-subtle text-xs">TODO: wire this outline to the generated documentation index.</p>
            </section>
        </article>
    );
}

export default GettingStartedPage;
