'use client';

import { CopyAnchorButton, cn } from '@seedcord/ui';

import type { ReactElement } from 'react';

function CopyAnchorButtonPage(): ReactElement {
    return (
        <div className={cn('space-y-10')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>CopyAnchorButton</h1>
                <p className={cn('text-subtle text-sm')}>
                    Composes <code>Button variant=&quot;ghost&quot; size=&quot;icon&quot;</code> with 32px override
                    (size-8, smallest icon button). Click copies the current URL with the given anchor id appended as
                    #hash. Hash icon → Check icon on success for 1.6s.
                </p>
            </header>
            <section className={cn('space-y-3')}>
                <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>
                    Default (hover to reveal in real usage)
                </h2>
                <div className={cn('space-y-2')}>
                    <div className={cn('group flex items-center gap-2 rounded-md border border-(--border) p-3')}>
                        <span className={cn('text-sm')}>method:resolveSync</span>
                        <CopyAnchorButton
                            anchorId="method-resolveSync"
                            label="resolveSync"
                            className={cn(
                                'opacity-0 transition-opacity group-hover:opacity-100 data-[copied=true]:opacity-100'
                            )}
                        />
                    </div>
                    <div className={cn('flex items-center gap-2 rounded-md border border-(--border) p-3')}>
                        <span className={cn('text-sm')}>always-visible variant</span>
                        <CopyAnchorButton anchorId="always-visible" label="Always visible" />
                    </div>
                </div>
            </section>
        </div>
    );
}

export default CopyAnchorButtonPage;
