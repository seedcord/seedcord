import { cn } from '@seedcord/ui';

import { highlightCode, type CodeLang } from '#lib/code/highlight';

import type { ReactNode } from 'react';

interface CodeCardProps {
    code: string;
    filename: string;
    lang?: CodeLang;
    note?: string;
    className?: string;
}

export async function CodeCard({ code, filename, lang = 'ts', note, className }: CodeCardProps): Promise<ReactNode> {
    const html = await highlightCode(code, lang);
    return (
        <figure className={cn('code-card min-w-0 overflow-hidden rounded-sm bg-(--seed-dark)', className)}>
            <figcaption className={cn('flex items-center gap-3 border-b-[3px] border-(--pith)/20 px-4 py-2.5')}>
                <span className={cn('flex items-center gap-2')} aria-hidden>
                    <span className={cn('size-3 rounded-full bg-(--flesh)')} />
                    <span className={cn('size-3 rounded-full bg-(--rind)')} />
                    <span className={cn('size-3 rounded-full bg-(--pith)')} />
                </span>
                <span className={cn('font-mono-code truncate text-xs text-(--pith)/55')}>{filename}</span>
                {note ? (
                    <span
                        className={cn(
                            'font-mono-code ml-auto hidden shrink-0 text-xs font-semibold text-(--pith)/80 sm:inline'
                        )}
                    >
                        {note}
                    </span>
                ) : null}
            </figcaption>
            <div className={cn('font-mono-code')} dangerouslySetInnerHTML={{ __html: html }} />
        </figure>
    );
}
