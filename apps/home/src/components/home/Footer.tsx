import { cn } from '@seedcord/ui';
import Link from 'next/link';

import { Materwelon } from '@/components/brand/Materwelon';

import type { ReactNode } from 'react';

const LINKS = [
    { label: 'GitHub', href: 'https://github.com/seedcord/seedcord' },
    { label: 'Docs', href: 'https://docs.seedcord.org' },
    { label: 'Guide', href: 'https://guide.seedcord.org' }
] as const;

export function Footer(): ReactNode {
    return (
        <footer className={cn('border-t-[3px] border-(--seed-dark) bg-(--cream)')}>
            <div className={cn('mx-auto max-w-7xl px-5 py-10')}>
                <div className={cn('flex flex-col items-center justify-between gap-6 sm:flex-row')}>
                    <div className={cn('flex items-center gap-3')}>
                        <Materwelon className={cn('size-8')} />
                        <span className={cn('font-semibold text-(--seed-dark)')}>seedcord</span>
                        <span className={cn('font-mono-code text-xs text-(--seed-dark)/70')}>v1.0 · Apache-2.0</span>
                    </div>
                    <nav className={cn('font-mono-code flex flex-wrap items-center gap-5 text-sm')}>
                        {LINKS.map((l) => (
                            <Link
                                key={l.label}
                                href={l.href}
                                target="_blank"
                                rel="noreferrer"
                                className={cn('text-(--seed-dark) transition-colors hover:text-(--flesh)')}
                            >
                                {l.label}
                            </Link>
                        ))}
                    </nav>
                </div>
                <p className={cn('font-mono-code mt-8 text-center text-xs text-(--seed-dark)/70 sm:text-left')}>
                    Built by{' '}
                    <Link
                        href="https://github.com/materwelonDhruv"
                        target="_blank"
                        rel="noreferrer"
                        className={cn('font-semibold text-(--seed-dark) transition-colors hover:text-(--flesh)')}
                    >
                        materwelonDhruv
                    </Link>
                </p>
            </div>
        </footer>
    );
}
