'use client';

import { ClipboardCheck, ClipboardCopy } from 'lucide-react';
import { useCallback, useState } from 'react';

import { cn } from '@lib/utils';

import Button from './Button';
import Icon from './Icon';

import type { ReactElement } from 'react';

interface CopyButtonProps {
    value: string;
    className?: string;
    idleLabel?: string;
    copiedLabel?: string;
    ariaLabel?: string;
}

const COPY_RESET_DELAY_MS = 2000;

function CopyButton({
    value,
    className,
    idleLabel = 'Copy',
    copiedLabel = 'Copied',
    ariaLabel
}: CopyButtonProps): ReactElement {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async (): Promise<void> => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), COPY_RESET_DELAY_MS);
        } catch {
            // swallow clipboard errors
        }
    }, [value]);

    return (
        <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label={ariaLabel ?? idleLabel}
            onClick={() => {
                void handleCopy();
            }}
            className={cn(
                'bg-surface-96 hover:bg-surface-96 z-10 h-9 w-9 rounded-full border border-transparent text-(--text) transition hover:border-(--accent-a)/45',
                copied ? 'text-(--accent-a)' : null,
                className
            )}
        >
            <span className="sr-only">{copied ? copiedLabel : idleLabel}</span>
            <Icon icon={copied ? ClipboardCheck : ClipboardCopy} size={18} />
        </Button>
    );
}

export default CopyButton;
