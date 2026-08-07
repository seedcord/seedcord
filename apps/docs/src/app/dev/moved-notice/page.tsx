import { cn } from '@seedcord/ui';
import { Suspense } from 'react';

import { MovedEntityNotice } from '@components/docs/MovedEntityNotice';

import type { ReactElement } from 'react';

function MovedNoticePage(): ReactElement {
    return (
        <div className={cn('space-y-10')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>Moved entity notice</h1>
                <p className={cn('text-subtle text-sm')}>
                    Shown on a package index when a cross-package link points at a symbol that no longer exists. Append{' '}
                    <code>?moved=CooldownManager</code> to this URL to preview it.
                </p>
            </header>

            <section className={cn('space-y-3')}>
                <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>In context</h2>
                <div className={cn('space-y-8')}>
                    <Suspense fallback={null}>
                        <MovedEntityNotice packageLabel="@seedcord/logger" />
                    </Suspense>
                    <section className={cn('space-y-3')}>
                        <p className={cn('text-subtle text-xs font-semibold tracking-[0.35em] uppercase')}>
                            Reference overview
                        </p>
                        <h3 className={cn('text-3xl font-semibold text-(--text) sm:text-4xl')}>
                            services · 0.11.0-next.0
                        </h3>
                    </section>
                </div>
            </section>
        </div>
    );
}

export default MovedNoticePage;
