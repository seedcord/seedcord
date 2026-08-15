import { Card, Icon, CopyAnchorButton, cn } from '@seedcord/ui';
import { Code } from 'lucide-react';

import { CommentParagraphs } from '#components/docs/entity/comments/CommentParagraphs';
import { DeprecatedEntity } from '#components/docs/entity/DeprecatedEntity';

import type { DeprecationStatus, EnumMemberModel } from '#lib/docs/types';
import type { ReactElement } from 'react';

function SignatureCell({
    label,
    signatureHtml,
    signatureText,
    value,
    showValueAfterSignature
}: {
    label: string;
    signatureHtml: string | null;
    signatureText: string;
    value: string | undefined;
    showValueAfterSignature: boolean;
}): ReactElement {
    const withHtml = (
        <div className={cn('text-subtle flex items-center gap-2 text-sm')}>
            <div
                className={cn('shiki-inline-wrapper truncate')}
                dangerouslySetInnerHTML={{ __html: signatureHtml ?? '' }}
            />
            {showValueAfterSignature ? <code className={cn('truncate font-mono')}>= {value}</code> : null}
        </div>
    );

    const withValue = (
        <div className={cn('text-subtle truncate text-sm')}>
            <code className={cn('truncate font-mono')}>
                {label} = {value}
            </code>
        </div>
    );

    const plain = (
        <div className={cn('text-subtle truncate text-sm')}>
            <code className={cn('truncate font-mono')}>{label}</code>
        </div>
    );

    if (signatureHtml) return withHtml;
    if (value !== undefined && !signatureText.includes(String(value))) return withValue;
    return plain;
}

function ActionsCell({
    anchorId,
    label,
    sourceUrl
}: {
    anchorId: string;
    label: string;
    sourceUrl: string | undefined;
}): ReactElement {
    return (
        <div className={cn('ml-auto flex h-8 w-18 shrink-0 items-center justify-end gap-2 pl-2')}>
            <CopyAnchorButton
                anchorId={anchorId}
                label={label}
                className={cn(
                    'size-8 transition-opacity duration-150',
                    'lg:opacity-0 lg:group-hover/name:opacity-100 lg:data-[copied=true]:opacity-100'
                )}
            />
            {sourceUrl ? (
                <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className={cn(
                        'text-subtle inline-flex size-8 items-center justify-center transition hover:text-(--text)'
                    )}
                    aria-label={`Open source for ${label} in a new tab`}
                >
                    <Icon icon={Code} size={16} />
                </a>
            ) : null}
        </div>
    );
}

export function EnumMemberCard({ member }: { member: EnumMemberModel }): ReactElement {
    const anchorId = member.id;
    const hasSummary = member.summary.length > 0;

    const deprecationStatus: DeprecationStatus | undefined = member.deprecationStatus;

    return (
        <article id={anchorId} className={cn('group/name relative h-full min-w-0')}>
            <DeprecatedEntity deprecationStatus={deprecationStatus}>
                <Card size="md" className={cn('group/name relative h-full min-w-0 sm:p-5')}>
                    <div className={cn('flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between')}>
                        <div className={cn('min-w-0 flex-1 space-y-3')}>
                            <div className={cn('group/name relative flex min-w-0 items-center')}>
                                <div className={cn('min-w-0')}>
                                    <SignatureCell
                                        label={member.label}
                                        signatureHtml={member.signature.html}
                                        signatureText={member.signature.text}
                                        value={member.value}
                                        showValueAfterSignature={
                                            member.value !== undefined &&
                                            !member.signature.text.includes(String(member.value))
                                        }
                                    />
                                </div>
                                <ActionsCell anchorId={anchorId} label={member.label} sourceUrl={member.sourceUrl} />
                            </div>
                        </div>
                    </div>
                    {hasSummary ? (
                        <CommentParagraphs paragraphs={member.summary} className={cn('mt-2 space-y-0')} />
                    ) : null}
                </Card>
            </DeprecatedEntity>
        </article>
    );
}
