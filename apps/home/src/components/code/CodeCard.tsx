import { cn } from '@seedcord/ui';

import { highlightCode, type CodeLang } from '@lib/code/highlight';

import type { ReactNode } from 'react';

interface CodeCardProps {
    code: string;
    filename: string;
    lang?: CodeLang;
    note?: string;
    // border + shadow vary by section background, so the section passes them (e.g. 'rule blk' or 'rule-cream blk-cream')
    className?: string;
}

export async function CodeCard({ code, filename, lang = 'ts', note, className }: CodeCardProps): Promise<ReactNode> {
    const html = await highlightCode(code, lang);
    return (
        <figure className={cn('code-card overflow-hidden rounded-sm bg-(--seed-dark)', className)}>
            <figcaption className={cn('flex items-center gap-3 border-b-[3px] border-(--cream)/20 px-4 py-2.5')}>
                <span className={cn('flex items-center gap-2')} aria-hidden>
                    <span className={cn('size-3 rounded-full bg-(--flesh)')} />
                    <span className={cn('size-3 rounded-full bg-(--rind)')} />
                    <span className={cn('size-3 rounded-full bg-(--cream)')} />
                </span>
                <span className={cn('font-mono-code truncate text-xs text-(--cream)/55')}>{filename}</span>
                {note ? (
                    <span className={cn('font-mono-code ml-auto text-xs font-semibold text-(--cream)/80')}>{note}</span>
                ) : null}
            </figcaption>
            <div className={cn('font-mono-code')} dangerouslySetInnerHTML={{ __html: html }} />
        </figure>
    );
}
