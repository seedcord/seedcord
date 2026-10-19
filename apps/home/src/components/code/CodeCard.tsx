import { cn, CopyButton } from '@seedcord/ui';
import { highlightToHtml } from '@seedcord/ui/shiki';

import type { HighlightLanguage } from '@seedcord/ui/shiki';
import type { ReactNode } from 'react';

interface CodeCardProps {
    code: string;
    filename: string;
    lang?: HighlightLanguage;
    note?: string;
    copyable?: boolean;
    className?: string;
}

export async function CodeCard({
    code,
    filename,
    lang = 'ts',
    note,
    copyable = false,
    className
}: CodeCardProps): Promise<ReactNode> {
    const source = code.replace(/^\n+/, '').trimEnd();
    const html = await highlightToHtml(source, lang, { onlyDark: true, throwOnFailure: true });
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
                {copyable ? (
                    <CopyButton
                        value={source}
                        ariaLabel={`Copy ${filename}`}
                        className={cn('-my-1.5 ml-auto size-7 shrink-0 text-(--pith)/55 hover:text-(--pith)')}
                    />
                ) : null}
            </figcaption>
            <div className={cn('font-mono-code')} dangerouslySetInnerHTML={{ __html: html }} />
        </figure>
    );
}
