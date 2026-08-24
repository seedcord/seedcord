'use client';

import { SettingsPopover } from '@seedcord/ui';

import { ClearHistoryRow } from './settings/ClearHistoryRow';

import type { ReactElement } from 'react';

export function HeaderSettingsPopover(): ReactElement {
    return (
        <SettingsPopover label="Open documentation settings">
            <ClearHistoryRow />
        </SettingsPopover>
    );
}
