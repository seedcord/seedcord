'use client';

import { errorCodeQuestion } from '@seedcord/docs-search';
import { Badge, Button, cn } from '@seedcord/ui';

import type { CodeMention, CodeMentions } from '@seedcord/docs-search';
import type { ReactElement } from 'react';

export const hasCodes = ({ swapped, hints }: CodeMentions): boolean => swapped.length + hints.length > 0;

interface NoteRow {
    mention: CodeMention;
    label: string;
    spokenEnd: string;
    canSearch: boolean;
}

function noteRows({ swapped, hints }: CodeMentions): NoteRow[] {
    return [
        ...swapped.map((mention) => ({ mention, label: 'Searching for', spokenEnd: '.', canSearch: false })),
        ...hints.map((mention) => ({ mention, label: 'Did you mean', spokenEnd: '?', canSearch: true }))
    ];
}

export function codeNotesText(codes: CodeMentions): string {
    return noteRows(codes)
        .map(({ mention, label, spokenEnd }) => `${label} ${mention.code} ${mention.name}${spokenEnd}`)
        .join(' ');
}

interface CodeNotesProps {
    codes: CodeMentions;
    onSearch: (mention: CodeMention) => void;
}

export function CodeNotes({ codes, onSearch }: CodeNotesProps): ReactElement {
    return (
        <div className={cn('space-y-1.5')}>
            {noteRows(codes).map(({ mention, label, canSearch }) => (
                <div key={mention.code} className={cn('flex min-h-6 items-center gap-2 text-sm/4')}>
                    <span className={cn('text-subtle shrink-0 max-sm:hidden')}>{label}</span>
                    <Badge variant="chip">{mention.code}</Badge>
                    <span className={cn('flex min-w-0')}>
                        <code className={cn('shiki-inline truncate')}>{mention.name}</code>
                    </span>
                    {canSearch ? (
                        <Button
                            variant="outline"
                            size="xs"
                            aria-label={`Search for ${errorCodeQuestion(mention.code)}`}
                            className={cn('ml-auto shrink-0')}
                            onClick={() => onSearch(mention)}
                        >
                            Search
                        </Button>
                    ) : null}
                </div>
            ))}
        </div>
    );
}
