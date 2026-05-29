import { CodePanel, cn } from '@seedcord/ui';

import { highlightCode } from '@lib/docs/formatting';

import type { ReactElement } from 'react';

const TS_SAMPLE = `export const compute = <T>(values: readonly T[], reducer: (acc: T, v: T) => T): T => {
    if (!values.length) throw new Error('empty');
    return values.slice(1).reduce(reducer, values[0]!);
};`;

const PLAIN_SAMPLE = 'no shiki html → renders as <pre><code>';

function Section({ title, children }: { title: string; children: ReactElement | ReactElement[] }): ReactElement {
    return (
        <section className={cn('space-y-3')}>
            <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>{title}</h2>
            {children}
        </section>
    );
}

async function CodePanelPage(): Promise<ReactElement> {
    const tsRepresentation = await highlightCode(TS_SAMPLE, 'ts');
    const plainRepresentation = { text: PLAIN_SAMPLE, html: null };

    return (
        <div className={cn('space-y-10')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>CodePanel</h1>
                <p className={cn('text-subtle text-sm')}>
                    Composes Card. Takes pre-rendered `CodeRepresentation` (text + optional shiki html). Highlighting is
                    a consumer concern; this dev page calls `highlightCode` server-side and passes the result.
                </p>
            </header>
            <Section title="With title + description (real shiki render)">
                <CodePanel
                    representation={tsRepresentation}
                    title="Variable declaration"
                    description="Sourced directly from the debugging manifest so you can inspect runtime defaults without leaving the docs."
                />
            </Section>
            <Section title="With description only">
                <CodePanel representation={tsRepresentation} description="Short trailing description, no title." />
            </Section>
            <Section title="Bare (no header)">
                <CodePanel representation={tsRepresentation} />
            </Section>
            <Section title="Text-only fallback (html is null)">
                <CodePanel representation={plainRepresentation} title="Plain text representation" />
            </Section>
        </div>
    );
}

export default CodePanelPage;
