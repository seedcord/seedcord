import { cn } from '@seedcord/ui';
import Link from 'next/link';

import type { ReactNode } from 'react';

// the Dark variants use a cream rule + green shadow so the press still reads on dark-ground sections
const press = 'motion-safe:hover:translate-x-[3px] motion-safe:hover:translate-y-[3px] motion-safe:hover:shadow-none';
const VARIANTS = {
    solid: `rule blk ${press} bg-(--flesh) text-(--cream)`,
    outline: `rule blk ${press} bg-(--cream) text-(--seed-dark)`,
    solidDark: `rule-cream blk-rind ${press} bg-(--flesh) text-(--cream)`,
    outlineDark: `rule-cream blk-rind ${press} bg-(--cream) text-(--seed-dark)`,
    ink: 'bg-(--seed-dark) text-(--cream) hover:bg-(--flesh)'
} as const;

export type PosterButtonVariant = keyof typeof VARIANTS;

interface PosterButtonProps {
    href: string;
    variant?: PosterButtonVariant;
    className?: string;
    children: ReactNode;
}

// justified: bespoke poster CTA, a sharp rule + hard offset shadow outside the ui Button
export function PosterButton({ href, variant = 'solid', className, children }: PosterButtonProps): ReactNode {
    const external = href.startsWith('http');
    return (
        <Link
            href={href}
            {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-sm font-semibold',
                'transition-[transform,box-shadow,background-color,color] duration-150 ease-out',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--rind)',
                VARIANTS[variant],
                className
            )}
        >
            {children}
        </Link>
    );
}
