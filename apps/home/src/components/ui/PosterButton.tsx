import { cn } from '@seedcord/ui';

import { pressable } from './press';
import { SiteLink } from './SiteLink';

import type { ReactNode } from 'react';

// the button translates over a fixed socket sibling.
const slide = cn('motion-safe:translate-1', 'motion-safe:hover:translate-0.5', 'motion-safe:active:translate-1.5');

const VARIANTS = {
    solid: { socket: 'bg-(--seed-dark)', button: 'rule bg-(--flesh-deep) text-(--pith)' },
    outline: { socket: 'bg-(--seed-dark)', button: 'rule bg-(--pith) text-(--seed-dark)' },
    solidDark: { socket: 'bg-(--rind)', button: 'rule-pith bg-(--flesh-deep) text-(--pith)' },
    outlineDark: { socket: 'bg-(--rind)', button: 'rule-pith bg-(--pith) text-(--seed-dark)' },
    ink: {
        socket: null,
        button: 'font-mono-code bg-(--seed-dark) px-3 py-1.5 text-sm text-(--pith) hover:bg-(--flesh-deep)'
    }
} as const;

type PosterButtonVariant = keyof typeof VARIANTS;

interface PosterButtonProps {
    href: string;
    variant?: PosterButtonVariant;
    ariaLabel?: string;
    current?: boolean;
    className?: string;
    wrapperClassName?: string;
    children: ReactNode;
}

export function PosterButton({
    href,
    variant = 'solid',
    ariaLabel,
    current = false,
    className,
    wrapperClassName,
    children
}: PosterButtonProps): ReactNode {
    const { socket, button } = VARIANTS[variant];
    return (
        <span className={cn('relative inline-flex', wrapperClassName)}>
            {socket ? (
                <span
                    aria-hidden
                    className={cn('pointer-events-none absolute inset-0 translate-2 rounded-sm', socket)}
                />
            ) : null}
            <SiteLink
                href={href}
                aria-label={ariaLabel}
                aria-current={current ? 'page' : undefined}
                className={cn(
                    'relative inline-flex items-center justify-center gap-2 rounded-sm font-semibold',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--rind)',
                    button,
                    socket ? cn('transition-[translate,background-color] duration-150 ease-out', slide) : pressable,
                    className
                )}
            >
                {children}
            </SiteLink>
        </span>
    );
}
