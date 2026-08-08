'use client';

import { tw, Button, IconSwap, cn, useTimedToggle } from '@seedcord/ui';
import { Check, Trash2 } from 'lucide-react';

import { clearDocsHistory } from '@lib/settings/clearHistory';

import { SettingsRow } from './SettingsRow';

import type { MouseEvent, ReactElement } from 'react';

const FEEDBACK_DURATION_MS = 2000;

export function ClearHistoryRow(): ReactElement {
    const [cleared, markCleared] = useTimedToggle(FEEDBACK_DURATION_MS);

    // blurs after clearing so the brand-red focus ring (`--flesh`) doesn't linger through the feedback window
    const handleClear = (event: MouseEvent<HTMLButtonElement>): void => {
        clearDocsHistory();
        markCleared();
        event.currentTarget.blur();
    };

    return (
        <SettingsRow title="Clear history" subtitle="Delete cached site navigation settings">
            <Button variant="ghost" size="icon" onClick={handleClear} aria-label="Clear history">
                <IconSwap
                    active={cleared}
                    idleIcon={Trash2}
                    activeIcon={Check}
                    size={16}
                    activeClassName={tw`text-(--rind)`}
                />
                <span className={cn('sr-only')} aria-live="polite">
                    {cleared ? 'History cleared' : ''}
                </span>
            </Button>
        </SettingsRow>
    );
}
