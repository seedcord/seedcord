'use client';

import { Button, IconSwap, cn, useTimedToggle } from '@seedcord/ui';
import { ClipboardCheck, ClipboardCopy } from 'lucide-react';
import { useCallback } from 'react';

import type { ReactElement } from 'react';

const COPY_RESET_DELAY_MS = 2000;

export interface CopyPageButtonProps {
    /** Path the button fetches the markdown from on click. */
    source: string;
    className?: string | undefined;
}

export function CopyPageButton({ source, className }: CopyPageButtonProps): ReactElement {
    const [copied, markCopied] = useTimedToggle(COPY_RESET_DELAY_MS);

    const copy = useCallback(async (): Promise<void> => {
        try {
            const response = await fetch(source);
            if (!response.ok) return;
            await navigator.clipboard.writeText(await response.text());
            markCopied();
        } catch {}
    }, [source, markCopied]);

    return (
        <Button
            variant="ghost"
            size="sm"
            aria-label={copied ? 'Copied as Markdown' : 'Copy as Markdown'}
            onClick={() => {
                void copy();
            }}
            className={cn(
                'text-subtle shrink-0 gap-2 hover:text-(--text)',
                copied ? 'text-(--flesh)' : null,
                className
            )}
        >
            <IconSwap active={copied} idleIcon={ClipboardCopy} activeIcon={ClipboardCheck} size={16} />
            <span>{copied ? 'Copied' : 'Copy as Markdown'}</span>
        </Button>
    );
}
