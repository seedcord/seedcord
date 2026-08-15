import { CodeBlock, cn } from '@seedcord/ui';

import { highlightCode } from '#lib/docs/formatting';

import type { ReactElement } from 'react';

const TS_SAMPLE = `function publish<K extends SubscriptionKey>(name: K, data: SubscriptionData<K>): void {
    this.bus.publish(name, data);
}`;

function Section({ title, children }: { title: string; children: ReactElement | ReactElement[] }): ReactElement {
    return (
        <section className={cn('space-y-3')}>
            <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>{title}</h2>
            {children}
        </section>
    );
}

async function CodeBlockPage(): Promise<ReactElement> {
    const tsRepresentation = await highlightCode(TS_SAMPLE, 'ts');

    return (
        <div className={cn('space-y-10')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>CodeBlock</h1>
                <p className={cn('text-subtle text-sm')}>
                    Composes Card with a custom figcaption header. Takes pre-rendered `CodeRepresentation`. Suppress the
                    copy button by passing `copyValue={null}`. Drops the previous async + shiki coupling; consumers
                    pre-highlight.
                </p>
            </header>
            <Section title="With label + copy (real shiki render)">
                <CodeBlock representation={tsRepresentation} label="bus.publish" />
            </Section>
            <Section title="Copy only (no label)">
                <CodeBlock representation={tsRepresentation} />
            </Section>
            <Section title="Label only (copy suppressed)">
                <CodeBlock representation={tsRepresentation} label="signature" copyValue={null} />
            </Section>
            <Section title="Custom copy value">
                <CodeBlock representation={tsRepresentation} label="install" copyValue="npm install seedcord" />
            </Section>
        </div>
    );
}

export default CodeBlockPage;
