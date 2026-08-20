import { Card } from './Card';
import { CopyButton } from './CopyButton';
import { cn } from './lib/cn';
import { tw } from './lib/tw';

import type { CodeRepresentation } from './types/CodeRepresentation';
import type { ReactElement, ReactNode } from 'react';

export interface CodeBlockProps {
    representation: CodeRepresentation;
    label?: string;
    /**
     * Optional override for the copy-button's clipboard value. Defaults to
     * `representation.text`. Pass `null` to suppress the copy button.
     */
    copyValue?: string | null;
    /** Rendered in the header beside the copy button. */
    actions?: ReactNode;
    className?: string;
}

const CODE_CONTAINER_CLASS = tw`code-scroll-area px-3 py-2 text-sm/relaxed text-(--text)`;

export function CodeBlock({ representation, label, copyValue, actions, className }: CodeBlockProps): ReactElement {
    const showCopy = copyValue !== null;
    const resolvedCopyValue = copyValue ?? representation.text;
    const showHeader = Boolean(label) || showCopy || Boolean(actions);

    return (
        <Card as="figure" variant="default" size="none" className={cn('overflow-hidden', className)}>
            {showHeader ? (
                <figcaption
                    className={cn(
                        'flex items-center justify-between gap-3 border-b border-(--border)/70 bg-(--surface-moderate) px-3 py-1 text-xs font-medium text-(--text-muted)'
                    )}
                >
                    <span className={cn('truncate')}>{label}</span>
                    <span className={cn('flex shrink-0 items-center gap-2')}>
                        {actions}
                        {showCopy ? (
                            <CopyButton
                                value={resolvedCopyValue}
                                ariaLabel="Copy code block"
                                className={cn('size-7')}
                            />
                        ) : null}
                    </span>
                </figcaption>
            ) : null}

            {representation.html ? (
                <div className={cn(CODE_CONTAINER_CLASS)}>
                    <div
                        className={cn('code-scroll-content')}
                        dangerouslySetInnerHTML={{ __html: representation.html }}
                    />
                </div>
            ) : (
                <div className={cn(CODE_CONTAINER_CLASS)}>
                    <pre className={cn('code-scroll-content leading-relaxed whitespace-pre')}>
                        <code>{representation.text}</code>
                    </pre>
                </div>
            )}
        </Card>
    );
}
