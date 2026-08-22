'use client';

import { CodeBlock, cn } from '@seedcord/ui';
import { useState } from 'react';

import { TransportControl } from '#components/TransportControl';

import type { Transport } from '#components/TransportControl';
import type { ReactElement } from 'react';

function sample(transport: Transport): string {
    return [
        `import { SlashHandler, SlashRoute } from '@seedcord/${transport}';`,
        '',
        "@SlashRoute('maintenance')",
        "export class Maintenance extends SlashHandler<'maintenance'> {",
        '    public async execute(): Promise<void> {',
        "        const notify = this.options.getUser('notify');",
        '    }',
        '}'
    ].join('\n');
}

function TransportPage(): ReactElement {
    const [inHeader, setInHeader] = useState<Transport>('gateway');
    const [standalone, setStandalone] = useState<Transport>('gateway');

    return (
        <div className={cn('mx-auto w-full max-w-3xl space-y-10 px-6 py-10')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('font-display text-2xl font-semibold tracking-tight text-(--text)')}>
                    Transport control
                </h1>
                <p className={cn('text-subtle text-sm')}>
                    Picks which transport a code sample shows. Sitting in a code block header is the placement it was
                    built for. It has no home in a real page yet.
                </p>
            </header>

            <section className={cn('space-y-3')}>
                <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>In a code header</h2>
                <CodeBlock
                    label="src/handlers/Maintenance.ts"
                    representation={{ text: sample(inHeader), html: null }}
                    actions={<TransportControl value={inHeader} onChange={setInHeader} size="sm" />}
                />
            </section>

            <section className={cn('space-y-3')}>
                <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>
                    On its own, both sizes
                </h2>
                <div className={cn('flex items-center gap-4')}>
                    <TransportControl value={standalone} onChange={setStandalone} size="sm" />
                    <TransportControl value={standalone} onChange={setStandalone} size="md" />
                </div>
            </section>
        </div>
    );
}

export default TransportPage;
