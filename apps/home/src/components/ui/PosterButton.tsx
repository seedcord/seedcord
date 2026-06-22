import { cn } from '@seedcord/ui';
import Link from 'next/link';

import type { ReactNode } from 'react';

const VARIANTS = {
    solid: 'rule blk bg-(--flesh) text-(--cream) motion-safe:hover:translate-x-[3px] motion-safe:hover:translate-y-[3px] motion-safe:hover:shadow-none',
    outline: 'rule bg-(--cream) text-(--seed-dark) hover:bg-(--seed-dark) hover:text-(--cream)',
    ink: 'bg-(--seed-dark) text-(--cream) hover:bg-(--flesh)'
} as const;

export type PosterButtonVariant = keyof typeof VARIANTS;

interface PosterButtonProps {
    href: string;
    variant?: PosterButtonVariant;
    className?: string;
    children: ReactNode;
}

// homepage button: the poster's sharp 3px rule + hard offset shadow, not the rounded soft-shadow @seedcord/ui Button shared with docs
export function PosterButton({ href, variant = 'solid', className, children }: PosterButtonProps): ReactNode {
    const external = href.startsWith('http');
    return (
        <Link
            href={href}
            {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-sm font-semibold',
                'transition-[transform,box-shadow,background-color,color] duration-150 ease-out',
                VARIANTS[variant],
                className
            )}
        >
            {children}
        </Link>
    );
}
