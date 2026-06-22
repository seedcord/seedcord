import { cn, tw } from '@seedcord/ui';

import type { ReactNode } from 'react';

// Hand-colored code specimens for the homepage. Bespoke (not the static @seedcord/ui CodePanel) because
// the homepage panels carry animated overlays (the Wire, the resolving type) the shared primitive can't host.
// Two-accent grammar: green (--rind) for keywords/types, flesh-red (--flesh) for the value/generated literal,
// everything else fades currentColor so it adapts to ink vs cream grounds.

const PANEL_BASE = tw`min-w-0 overflow-hidden rounded-lg border`;
const PRE_BASE = tw`font-mono-code overflow-x-auto px-3 py-2.5 text-[12.5px] leading-relaxed`;
const INDENT_REM = 1.25;

interface CodePanelProps {
    file: string;
    badge?: string;
    panelClass: string;
    fileClass: string;
    textClass: string;
    dimmed?: boolean;
    children: ReactNode;
}

export function CodePanel({
    file,
    badge,
    panelClass,
    fileClass,
    textClass,
    dimmed,
    children
}: CodePanelProps): ReactNode {
    return (
        <div className={cn(PANEL_BASE, panelClass, dimmed && 'opacity-55')}>
            <div className={cn('flex items-center gap-2 border-b border-inherit px-3 py-1.5')}>
                <span className={cn('font-mono-code text-[11px]', fileClass)}>{file}</span>
                {badge ? (
                    <span
                        className={cn(
                            'font-mono-code rounded-sm bg-(--rind)/15 px-1.5 py-0.5 text-[9px] text-(--rind)'
                        )}
                    >
                        {badge}
                    </span>
                ) : null}
            </div>
            <pre className={cn(PRE_BASE, textClass)}>
                <code>{children}</code>
            </pre>
        </div>
    );
}

export function Ln({ children, indent = 0 }: { children: ReactNode; indent?: number }): ReactNode {
    return <div style={{ paddingLeft: `${indent * INDENT_REM}rem` }}>{children}</div>;
}
// dim punctuation/comments fade currentColor so they adapt to ink vs cream
export function Dim({ children }: { children: ReactNode }): ReactNode {
    return <span className={cn('opacity-45')}>{children}</span>;
}
export function Str({ children }: { children: ReactNode }): ReactNode {
    return <span className={cn('opacity-70')}>{children}</span>;
}
export function Kw({ children }: { children: ReactNode }): ReactNode {
    return <span className={cn('text-(--rind)')}>{children}</span>;
}
// a value in motion / a passed literal, brand red with a faint chip
export function Val({ children }: { children: ReactNode }): ReactNode {
    return <span className={cn('rounded-sm bg-(--flesh)/12 px-0.5 text-(--flesh)')}>{children}</span>;
}
// a compiler-derived type rendered in the comment, red italic so the eye catches what seedcord generated
export function RedType({ children }: { children: ReactNode }): ReactNode {
    return <span className={cn('text-(--flesh) italic')}>{children}</span>;
}
