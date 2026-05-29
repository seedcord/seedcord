'use client';

import { cn, CodeBlock, Disclosure, DisclosureChevron, DisclosurePanel, DisclosureTrigger } from '@seedcord/ui';

import type { CommentExample } from '@lib/docs/types';
import type { ReactElement } from 'react';

interface CommentExamplesProps {
    examples: readonly CommentExample[];
    className?: string;
    open?: boolean;
}

function CommentExamples({ examples, className, open = false }: CommentExamplesProps): ReactElement | null {
    if (!examples.length) return null;

    return (
        <Disclosure defaultOpen={open} className={cn('space-y-3', className)}>
            <DisclosureTrigger className={cn('text-sm font-semibold text-(--text)')}>
                <DisclosureChevron size={18} />
                <span>Examples</span>
            </DisclosureTrigger>
            <DisclosurePanel>
                <div className={cn('space-y-3 pt-2')}>
                    {examples.map((example, index) => {
                        const representation = example.code;
                        const key = example.caption ?? representation.html ?? `example-${index}`;
                        return (
                            <CodeBlock
                                key={key}
                                representation={representation}
                                {...(example.caption !== undefined && { label: example.caption })}
                                className={cn('text-xs sm:text-sm')}
                            />
                        );
                    })}
                </div>
            </DisclosurePanel>
        </Disclosure>
    );
}

export default CommentExamples;
