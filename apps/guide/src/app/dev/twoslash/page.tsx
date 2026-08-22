import { CodeBlock, cn } from '@seedcord/ui';

import { twoslashBlock } from '#lib/twoslash';

import { SAMPLES } from './samples';

import type { Sample } from './samples';
import type { ReactElement } from 'react';

async function Block({ heading, label, code }: Sample): Promise<ReactElement> {
    const representation = await twoslashBlock(code, 'ts', true);

    return (
        <section className={cn('space-y-3')}>
            <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>{heading}</h2>
            <CodeBlock label={label} representation={representation} />
        </section>
    );
}

function TwoslashPage(): ReactElement {
    return (
        <div className={cn('mx-auto w-full max-w-3xl space-y-10 px-6 py-10')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('font-display text-2xl font-semibold tracking-tight text-(--text)')}>Twoslash</h1>
                <p className={cn('text-subtle text-sm')}>
                    Every compiler line renders in the flow of the block, so nothing floats over the code and nothing
                    gets clipped by the scroll area. The caret sits under the middle of the squiggle.
                </p>
            </header>

            {SAMPLES.map((sample) => (
                <Block key={sample.heading} {...sample} />
            ))}
        </div>
    );
}

export default TwoslashPage;
