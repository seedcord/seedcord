'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@lib/utils';
import Icon from '@ui/Icon';

import type { CommentExample } from '@lib/docs/types';
import type { ReactElement } from 'react';

interface CommentExamplesProps {
    examples: readonly CommentExample[];
    className?: string;
    open?: boolean;
}

const codeContainerClass = 'code-scroll-area panel mb-2 px-3 py-2 text-xs text-(--text) sm:text-sm';

function CommentExamples({ examples, className, open = false }: CommentExamplesProps): ReactElement | null {
    const [isOpen, setIsOpen] = useState(open);

    if (!examples.length) return null;

    return (
        <div className={cn('space-y-3', className)}>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-(--text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--outline-accent-b-moderate)"
                aria-expanded={isOpen}
            >
                <span className="flex items-center">
                    <Icon
                        icon={ChevronDown}
                        size={18}
                        className={cn(
                            'text-subtle transition-transform duration-200',
                            isOpen ? 'rotate-0' : '-rotate-90'
                        )}
                        aria-hidden
                    />
                </span>
                <span>Examples</span>
            </button>

            <div className={cn('pt-2', isOpen ? 'block' : 'hidden')}>
                {examples.map((example, index) => {
                    const representation = example.code;
                    const key = example.caption ?? representation.html ?? `example-${index}`;

                    return (
                        <figure key={key} className="space-y-1">
                            {example.caption ? (
                                <figcaption className="text-subtle text-xs font-semibold tracking-[0.08em] uppercase">
                                    {example.caption}
                                </figcaption>
                            ) : null}
                            <div className={codeContainerClass}>
                                {representation.html ? (
                                    <div
                                        className="code-scroll-content"
                                        dangerouslySetInnerHTML={{ __html: representation.html }}
                                    />
                                ) : (
                                    <pre className="code-scroll-content leading-relaxed whitespace-pre">
                                        <code>{representation.text}</code>
                                    </pre>
                                )}
                            </div>
                        </figure>
                    );
                })}
            </div>
        </div>
    );
}

export default CommentExamples;
