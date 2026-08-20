import { cn, Icon, CopyAnchorButton } from '@seedcord/ui';
import { Code } from 'lucide-react';

import { CommentParagraphs } from '#components/docs/entity/comments/CommentParagraphs';

import type { EntityMemberSummary } from '#lib/docs/types';
import type { ReactElement } from 'react';

interface MemberRowHeaderProps {
    member: EntityMemberSummary;
    anchorId: string;
    tags: string[];
    prefix?: 'property' | 'method' | 'constructor' | 'typeParameter';
}

export function MemberRowHeader({ member, anchorId, tags, prefix }: MemberRowHeaderProps): ReactElement {
    return (
        <div className={cn('flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between')}>
            <div className={cn('min-w-0 flex-1 space-y-3')}>
                {tags.length ? (
                    <ul
                        className={cn(
                            'text-subtle flex flex-wrap items-center gap-1 text-[0.55rem] tracking-widest uppercase'
                        )}
                    >
                        {tags.map((tag) => (
                            <li
                                key={tag}
                                className={cn(
                                    'border-border rounded-full border bg-(--surface-moderate) px-3 py-0.5 font-semibold'
                                )}
                            >
                                {tag}
                            </li>
                        ))}
                    </ul>
                ) : null}
                <div className={cn('flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2')}>
                    <div className={cn('group/name relative flex min-w-0 flex-1 items-center')}>
                        <CopyAnchorButton
                            anchorId={anchorId}
                            label={member.label}
                            className={cn(
                                'text-subtle z-10 flex size-8 items-center justify-center transition-opacity hover:text-(--text)',
                                'order-last',
                                'md:absolute md:top-1/2 md:-left-8 md:-translate-y-1/2 md:opacity-0 md:group-hover/name:opacity-100 md:group-has-focus-visible/name:opacity-100 md:data-[copied=true]:opacity-100'
                            )}
                        />
                        <h3 className={cn('truncate text-base font-semibold text-(--text) sm:text-lg')}>
                            {prefix === 'method' ? `${member.label}()` : member.label}
                        </h3>
                    </div>
                    <div className={cn('ml-auto flex items-center gap-2')}>
                        {member.sourceUrl ? (
                            <a
                                href={member.sourceUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className={cn(
                                    'text-subtle inline-flex size-8 items-center justify-center transition hover:text-(--text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--outline-accent-b-moderate)'
                                )}
                                aria-label={`Open source for ${member.label} in a new tab`}
                            >
                                <Icon icon={Code} size={16} />
                            </a>
                        ) : null}
                    </div>
                </div>
                {member.description ? (
                    <CommentParagraphs paragraphs={[member.description]} className={cn('space-y-0')} />
                ) : null}
            </div>
        </div>
    );
}
