'use client';

import { Check, Hash } from 'lucide-react';
import { type ReactElement, useCallback } from 'react';

import { Button } from './Button';
import { IconSwap } from './IconSwap';
import { cn } from './lib/cn';
import { useTimedToggle } from './lib/useTimedToggle';

const ICON_FLIP_DURATION_MS = 1400;
const FEEDBACK_HOLD_DURATION_MS = 2000;
const DEFAULT_ICON_SIZE = 16;

async function copyLink(anchorId: string | undefined): Promise<void> {
    const url = new URL(globalThis.location.href);
    url.hash = anchorId ?? '';
    // navigator.clipboard is undefined outside a secure context
    await navigator.clipboard.writeText(url.toString());
}

// runs the same copy and feedback as clicking the button for that anchor
export function clickCopyAnchor(anchorId: string | undefined): void {
    document.querySelector<HTMLElement>(`[data-copy-anchor="${CSS.escape(anchorId ?? '')}"]`)?.click();
}

export interface CopyAnchorButtonProps {
    anchorId?: string; // leave out to copy the page url w/o a fragment
    label: string;
    iconSize?: number;
    className?: string;
}

export function CopyAnchorButton({
    anchorId,
    label,
    iconSize = DEFAULT_ICON_SIZE,
    className
}: CopyAnchorButtonProps): ReactElement {
    // the longer data-copied window keeps hover/focus styling asserted after the glyph returns to idle
    const [iconCopied, markIconCopied] = useTimedToggle(ICON_FLIP_DURATION_MS);
    const [feedbackHold, markFeedbackHold] = useTimedToggle(FEEDBACK_HOLD_DURATION_MS);

    const handleCopyLink = useCallback(() => {
        copyLink(anchorId).then(
            () => {
                markIconCopied();
                markFeedbackHold();
            },
            () => {}
        );
    }, [anchorId, markIconCopied, markFeedbackHold]);

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyLink}
            data-copy-anchor={anchorId ?? ''}
            aria-label={iconCopied ? `Copied link to ${label}` : `Copy link to ${label}`}
            data-copied={feedbackHold || undefined}
            className={cn('text-subtle size-8 rounded-md hover:bg-transparent hover:text-(--text)', className)}
        >
            <IconSwap active={iconCopied} idleIcon={Hash} activeIcon={Check} size={iconSize} />
            <span className={cn('sr-only')} aria-live="polite">
                {iconCopied ? 'Link copied to clipboard' : ''}
            </span>
        </Button>
    );
}
