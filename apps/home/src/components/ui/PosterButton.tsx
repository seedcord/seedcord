import { cn } from '@seedcord/ui';
import Link from 'next/link';

import { pressable } from './press';

import type { ReactNode } from 'react';

// the button translates over a fixed socket sibling.
const slide = cn('motion-safe:translate-1', 'motion-safe:hover:translate-0.5', 'motion-safe:active:translate-1.5');

const VARIANTS = {
    solid: { socket: 'bg-(--seed-dark)', button: 'rule bg-(--flesh-deep) text-(--cream)' },
    outline: { socket: 'bg-(--seed-dark)', button: 'rule bg-(--cream) text-(--seed-dark)' },
    solidDark: { socket: 'bg-(--rind)', button: 'rule-cream bg-(--flesh-deep) text-(--cream)' },
    outlineDark: { socket: 'bg-(--rind)', button: 'rule-cream bg-(--cream) text-(--seed-dark)' },
    ink: { socket: null, button: 'bg-(--seed-dark) text-(--cream) hover:bg-(--flesh-deep)' }
} as const;

type PosterButtonVariant = keyof typeof VARIANTS;

interface PosterButtonProps {
    href: string;
    variant?: PosterButtonVariant;
    className?: string;
    children: ReactNode;
}

export function PosterButton({ href, variant = 'solid', className, children }: PosterButtonProps): ReactNode {
    const external = href.startsWith('http');
    const { socket, button } = VARIANTS[variant];
    return (
        <span className={cn('relative inline-flex')}>
            {socket ? (
                <span
                    aria-hidden
                    className={cn('pointer-events-none absolute inset-0 translate-2 rounded-sm', socket)}
                />
            ) : null}
            <Link
                href={href}
                {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
                className={cn(
                    'relative inline-flex items-center justify-center gap-2 rounded-sm font-semibold',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--rind)',
                    button,
                    socket ? cn('transition-[translate,background-color] duration-150 ease-out', slide) : pressable,
                    className
                )}
            >
                {children}
            </Link>
        </span>
    );
}
