'use client';

import { Check, Hash } from 'lucide-react';
import { type ReactElement, useCallback } from 'react';

import { Button } from './Button';
import { IconSwap } from './IconSwap';
import { cn } from './lib/cn';
import { useTimedToggle } from './lib/useTimedToggle';

const ICON_FLIP_DURATION_MS = 1400;
const FEEDBACK_HOLD_DURATION_MS = 2000;

export interface CopyAnchorButtonProps {
    anchorId: string;
    label: string;
    className?: string;
}

export function CopyAnchorButton({ anchorId, label, className }: CopyAnchorButtonProps): ReactElement {
    // the longer data-copied window keeps hover/focus styling asserted after the glyph returns to idle
    const [iconCopied, markIconCopied] = useTimedToggle(ICON_FLIP_DURATION_MS);
    const [feedbackHold, markFeedbackHold] = useTimedToggle(FEEDBACK_HOLD_DURATION_MS);

    const handleCopyLink = useCallback(() => {
        try {
            const url = new URL(globalThis.location.href);
            url.hash = anchorId;

            if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
                void navigator.clipboard
                    .writeText(url.toString())
                    .then(() => {
                        markIconCopied();
                        markFeedbackHold();
                    })
                    .catch(() => {});
            }
        } catch {}
    }, [anchorId, markIconCopied, markFeedbackHold]);

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyLink}
            aria-label={iconCopied ? `Copied link to ${label}` : `Copy link to ${label}`}
            data-copied={feedbackHold || undefined}
            className={cn('text-subtle size-8 rounded-md hover:bg-transparent hover:text-(--text)', className)}
        >
            <IconSwap active={iconCopied} idleIcon={Hash} activeIcon={Check} size={16} />
            <span className={cn('sr-only')} aria-live="polite">
                {iconCopied ? 'Link copied to clipboard' : ''}
            </span>
        </Button>
    );
}
