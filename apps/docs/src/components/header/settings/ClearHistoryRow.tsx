'use client';

import { Check, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { clearDocsHistory } from '@lib/settings/clearHistory';
import { tw } from '@lib/utils';
import Button from '@ui/Button';
import Icon from '@ui/Icon';

import SettingsRow from './SettingsRow';

import type { ReactElement } from 'react';

const FEEDBACK_DURATION = 2000;

function ClearHistoryRow(): ReactElement {
    const [cleared, setCleared] = useState(false);

    const handleClear = (): void => {
        clearDocsHistory();
        setCleared(true);
        setTimeout(() => {
            setCleared(false);
        }, FEEDBACK_DURATION);
    };

    return (
        <SettingsRow title="Clear history" subtitle="Delete cached site navigation settings">
            <Button variant="ghost" size="icon" onClick={handleClear} aria-label="Clear history">
                <Icon
                    icon={cleared ? Check : Trash2}
                    size={16}
                    {...(cleared ? { className: tw`text-(--accent-b)` } : {})}
                />
            </Button>
        </SettingsRow>
    );
}

export default ClearHistoryRow;
