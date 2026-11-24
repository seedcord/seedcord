import { Slot } from '@radix-ui/react-slot';
import { cn } from 'cn';

import { pressable } from './lib/press';
import { tw } from './lib/tw';

import type { ReactElement } from 'react';

// the button translates over a fixed socket sibling.
const slide = cn('motion-safe:translate-1', 'motion-safe:hover:translate-0.5', 'motion-safe:active:translate-1.5');
const socketSize = tw`font-display px-4 py-2.5 text-base sm:px-7 sm:py-3 sm:text-lg`;

const VARIANTS = {
    solid: {
        socket: 'bg-(--poster-socket)',
        button: 'border-3 border-(--poster-rule) bg-(--flesh-deep) text-(--pith)'
    },
    outline: {
        socket: 'bg-(--poster-socket)',
        button: 'border-3 border-(--poster-rule) bg-(--pith) text-(--seed-dark)'
    },
    ink: {
        socket: null,
        button: 'font-mono-code bg-(--seed-dark) px-3 py-1.5 text-sm text-(--pith) hover:bg-(--flesh-deep)'
    }
} as const;

interface PosterButtonProps {
    variant?: keyof typeof VARIANTS;
    className?: string;
    wrapperClassName?: string;
    // the link to style. each site passes its own link component
    children: ReactElement;
}

export function PosterButton({
    variant = 'solid',
    className,
    wrapperClassName,
    children
}: PosterButtonProps): ReactElement {
    const { socket, button } = VARIANTS[variant];
    return (
        <span className={cn('relative inline-flex', wrapperClassName)}>
            {socket ? (
                <span
                    aria-hidden
                    className={cn('pointer-events-none absolute inset-0 translate-2 rounded-sm', socket)}
                />
            ) : null}
            <Slot
                className={cn(
                    'relative inline-flex items-center justify-center gap-2 rounded-sm font-semibold',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--rind)',
                    button,
                    socket
                        ? cn('transition-[translate,background-color] duration-150 ease-out', slide, socketSize)
                        : pressable,
                    className
                )}
            >
                {children}
            </Slot>
        </span>
    );
}
