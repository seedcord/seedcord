import { cn, CopyButton } from '@seedcord/ui';
import { highlightToHtml } from '@seedcord/ui/shiki';

import type { HighlightLanguage } from '@seedcord/ui/shiki';
import type { ReactNode } from 'react';

const SAMPLE_INDENT = 4;

function tabIndented(source: string): string {
    return source.replaceAll(
        /^ +/gm,
        (indent) => '\t'.repeat(Math.floor(indent.length / SAMPLE_INDENT)) + ' '.repeat(indent.length % SAMPLE_INDENT)
    );
}

interface CodeCardProps {
    code: string;
    filename: string;
    lang?: HighlightLanguage;
    note?: string;
    copyable?: boolean;
    scrolls?: boolean;
    className?: string;
}

export async function CodeCard({
    code,
    filename,
    lang = 'ts',
    note,
    copyable = false,
    scrolls = false,
    className
}: CodeCardProps): Promise<ReactNode> {
    const source = code.replace(/^\n+/, '').trimEnd();
    // styles/utilities.css narrows tab-size on a phone and reads --depth to indent a wrapped line
    const tabbed = tabIndented(source);
    const depths = tabbed.split('\n').map((line) => line.search(/[^\t]|$/));
    const html = await highlightToHtml(tabbed, lang, {
        onlyDark: true,
        throwOnFailure: true,
        transformers: [
            {
                line(node, line) {
                    node.properties.style = `--depth:${depths[line - 1] ?? 0}`;
                }
            }
        ]
    });
    return (
        <figure
            className={cn(
                'code-card min-w-0 overflow-hidden rounded-sm bg-(--seed-dark)',
                scrolls && 'flex flex-col',
                className
            )}
        >
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
            <div
                // a scrolling region needs focus for the arrow keys to reach it
                tabIndex={scrolls ? 0 : undefined}
                className={cn('font-mono-code', scrolls && 'min-h-0 flex-1 overflow-y-auto pb-6')}
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </figure>
    );
}
