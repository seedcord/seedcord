import { highlightToHtml } from '@lib/shiki';
import { cn } from '@lib/utils';

import CopyButton from './CopyButton';

import type { ReactElement } from 'react';
import type { BundledLanguage } from 'shiki';

interface CodeBlockProps {
    code: string;
    lang?: BundledLanguage;
    className?: string;
    hideCopyButton?: boolean;
    label?: string;
}

async function CodeBlock({
    code,
    lang = 'ts',
    className,
    hideCopyButton = false,
    label
}: CodeBlockProps): Promise<ReactElement> {
    const highlightedHtml = await highlightToHtml(code, lang);
    const codeContainerClass = 'code-scroll-area px-4 py-4 text-sm leading-relaxed text-[var(--text)]';

    const showHeader = Boolean(label ?? !hideCopyButton);

    return (
        <figure className={cn('card bg-surface-96 shadow-soft relative', className)}>
            {showHeader ? (
                <figcaption className="border-border/70 text-subtle flex items-center justify-between gap-3 border-b bg-[color-mix(in_oklab,var(--surface)_90%,#ffffff_10%)] px-4 py-2 text-xs font-semibold tracking-wide uppercase">
                    <span className="truncate">{label}</span>
                    {!hideCopyButton ? <CopyButton value={code} ariaLabel="Copy code block" /> : null}
                </figcaption>
            ) : null}

            <div className="relative">
                {highlightedHtml ? (
                    <div className={cn(codeContainerClass)}>
                        <div className="code-scroll-content" dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
                    </div>
                ) : (
                    <div className={cn(codeContainerClass)}>
                        <pre className="code-scroll-content leading-relaxed whitespace-pre">
                            <code>{code}</code>
                        </pre>
                    </div>
                )}
            </div>
        </figure>
    );
}

export default CodeBlock;
