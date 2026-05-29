'use client';

import { tw, Button, IconSwap, cn, useTimedToggle } from '@seedcord/ui';
import { Check, Trash2 } from 'lucide-react';

import { clearDocsHistory } from '@lib/settings/clearHistory';

import SettingsRow from './SettingsRow';

import type { MouseEvent, ReactElement } from 'react';

const FEEDBACK_DURATION_MS = 2000;

function ClearHistoryRow(): ReactElement {
    const [cleared, markCleared] = useTimedToggle(FEEDBACK_DURATION_MS);

    // Blur the button after the action so the focus ring (`--accent-a`, which is brand-red)
    // doesn't linger across the timed-feedback window. The action is already complete; nothing
    // left to focus on this control.
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
                    activeClassName={tw`text-(--accent-b)`}
                />
                <span className={cn('sr-only')} aria-live="polite">
                    {cleared ? 'History cleared' : ''}
                </span>
            </Button>
        </SettingsRow>
    );
}

export default ClearHistoryRow;
