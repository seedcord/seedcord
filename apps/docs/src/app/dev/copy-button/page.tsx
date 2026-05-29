'use client';

import { CopyButton, cn } from '@seedcord/ui';

import type { ReactElement } from 'react';

function CopyButtonPage(): ReactElement {
    return (
        <div className={cn('space-y-10')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>CopyButton</h1>
                <p className={cn('text-subtle text-sm')}>
                    Composes <code>Button variant=&quot;ghost&quot; size=&quot;icon&quot;</code> with internal `copied`
                    state. 36px square (size-9 override on top of 40px icon variant). Sticky position overlay; consumers
                    place it absolutely on code panels.
                </p>
            </header>
            <section className={cn('space-y-3')}>
                <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>Default</h2>
                <div
                    className={cn(
                        'bg-surface-subtle relative flex h-40 items-center justify-center rounded-xl border border-(--border) p-4'
                    )}
                >
                    <CopyButton value="hello from /dev/copy-button" ariaLabel="Copy sample text" />
                    <span className={cn('text-subtle text-xs')}>click → &ldquo;Copied&rdquo; for 2s</span>
                </div>
            </section>
            <section className={cn('space-y-3')}>
                <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>
                    In a card overlay (real consumer pattern)
                </h2>
                <div className={cn('bg-surface-moderate relative h-32 rounded-xl border border-(--border) p-4')}>
                    <CopyButton
                        value="npm install seedcord"
                        ariaLabel="Copy install command"
                        className={cn('absolute top-3 right-3')}
                    />
                    <code className={cn('text-sm')}>npm install seedcord</code>
                </div>
            </section>
        </div>
    );
}

export default CopyButtonPage;
