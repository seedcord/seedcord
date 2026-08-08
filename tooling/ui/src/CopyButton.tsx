'use client';

import { ClipboardCheck, ClipboardCopy } from 'lucide-react';
import { useCallback } from 'react';

import { Button } from './Button';
import { IconSwap } from './IconSwap';
import { cn } from './lib/cn';
import { useTimedToggle } from './lib/useTimedToggle';

import type { ReactElement } from 'react';

const COPY_RESET_DELAY_MS = 2000;

export interface CopyButtonProps {
    value: string;
    className?: string;
    idleLabel?: string;
    copiedLabel?: string;
    ariaLabel?: string;
}

export function CopyButton({
    value,
    className,
    idleLabel = 'Copy',
    copiedLabel = 'Copied',
    ariaLabel
}: CopyButtonProps): ReactElement {
    const [copied, markCopied] = useTimedToggle(COPY_RESET_DELAY_MS);

    const handleCopy = useCallback(async (): Promise<void> => {
        try {
            await navigator.clipboard.writeText(value);
            markCopied();
        } catch {}
    }, [value, markCopied]);

    return (
        <Button
            variant="ghost"
            size="icon"
            aria-label={ariaLabel ?? (copied ? copiedLabel : idleLabel)}
            onClick={() => {
                void handleCopy();
            }}
            className={cn(
                'text-subtle size-9 rounded-md hover:text-(--text)',
                copied ? 'text-(--flesh)' : null,
                className
            )}
        >
            <span className={cn('sr-only')}>{copied ? copiedLabel : idleLabel}</span>
            <IconSwap active={copied} idleIcon={ClipboardCopy} activeIcon={ClipboardCheck} size={18} />
        </Button>
    );
}
