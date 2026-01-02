import { Code } from 'lucide-react';

import { cn } from '@lib/utils';
// access label formatting is now shown in signatures; import removed
import CopyAnchorButton from '@ui/CopyAnchorButton';
import Icon from '@ui/Icon';

import CommentParagraphs from '../comments/CommentParagraphs';

import type { EntityMemberSummary } from '../types';
import type { ReactElement } from 'react';

export interface MemberCardHeaderProps {
    member: EntityMemberSummary;
    anchorId: string;
    tags: string[];
    prefix?: 'property' | 'method' | 'constructor' | 'typeParameter';
}

function MemberCardHeader({ member, anchorId, tags, prefix }: MemberCardHeaderProps): ReactElement {
    return (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1 space-y-3">
                {tags.length ? (
                    <ul className="text-subtle flex flex-wrap items-center gap-1 text-[0.55rem] tracking-widest uppercase">
                        {tags.map((tag) => (
                            <li
                                key={tag}
                                className="border-border bg-surface-moderate rounded-full border px-3 py-0.5 font-semibold"
                            >
                                {tag}
                            </li>
                        ))}
                    </ul>
                ) : null}
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                    <div className="group/name relative flex min-w-0 flex-1 items-center">
                        <CopyAnchorButton
                            anchorId={anchorId}
                            label={member.label}
                            className={cn(
                                'text-subtle z-10 flex h-8 w-8 items-center justify-center transition-opacity hover:text-(--text)',
                                'static order-last opacity-100',
                                'md:absolute md:top-1/2 md:-left-8 md:-translate-y-1/2 md:opacity-0 md:group-focus-within/name:opacity-100 md:group-hover/name:opacity-100 md:group-active/name:opacity-100'
                            )}
                        />
                        <h3 className="truncate text-base font-semibold text-(--text) sm:text-lg">
                            {prefix === 'method' ? `${member.label}()` : member.label}
                        </h3>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        {member.sourceUrl ? (
                            <a
                                href={member.sourceUrl}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="text-subtle inline-flex h-8 w-8 items-center justify-center transition hover:text-(--text) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--outline-accent-b-moderate)"
                                aria-label={`Open source for ${member.label} in a new tab`}
                            >
                                <Icon icon={Code} size={16} />
                            </a>
                        ) : null}
                    </div>
                </div>
                {member.description ? (
                    <CommentParagraphs paragraphs={[member.description]} className="space-y-0" />
                ) : null}
            </div>
        </div>
    );
}

export default MemberCardHeader;
