import { cn } from '@seedcord/ui';
import Link from 'next/link';

import type { ReactElement } from 'react';

const SHELL_PIECES = [
    {
        href: '/dev/transport',
        label: 'Transport control',
        description: 'the gateway and http picker for code samples, in a code header and on its own'
    },
    {
        href: '/dev/mdx-kit',
        label: 'The mdx kit',
        description: 'every element the guide component map renders, with the source that produced it'
    }
] as const;

function DevIndex(): ReactElement {
    return (
        <main className={cn('mx-auto w-full max-w-5xl space-y-8 px-6 py-10')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('font-display text-2xl font-semibold tracking-tight text-(--text)')}>
                    Dev playground
                </h1>
                <p className={cn('text-subtle text-sm')}>
                    Previews for the pieces of the guide shell that live in @seedcord/ui. Each one renders against mock
                    data so only the thing under review changes between variants.
                </p>
            </header>
            <section className={cn('space-y-3')}>
                <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>Shell</h2>
                <ul className={cn('space-y-1 text-sm')}>
                    {SHELL_PIECES.map(({ href, label, description }) => (
                        <li key={href}>
                            <Link href={href} className={cn('text-(--text) hover:text-(--flesh)')}>
                                {label}
                            </Link>
                            <span className={cn('text-subtle')}>: {description}</span>
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}

export default DevIndex;
