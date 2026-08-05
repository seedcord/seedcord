import React from 'react';

import { CommandRefreshPrompt } from '@ui/components/CommandRefreshPrompt';
import { ErrorDisplay } from '@ui/components/ErrorDisplay';
import { QuitConfirmCard } from '@ui/components/QuitConfirmCard';
import { RestartRequiredCard } from '@ui/components/RestartRequiredCard';

import type { DevState } from '@ui/stores/DevStore';
import type { ReactElement } from 'react';

type NoticeKey = 'quit' | 'commands' | 'error' | 'restart';

export interface Notice {
    readonly key: NoticeKey;
    /** Description shown on the status line's left side. */
    readonly summary: string;
    /** What to press. */
    readonly action: string;
    readonly card: ReactElement;
}

const RESTART = 'press r to restart';

/** Every pending notice, ranked with the one that blocks a decision first. */
export function noticesOf(state: DevState): readonly Notice[] {
    const notices: Notice[] = [];

    if (state.quitArmed) {
        notices.push({ key: 'quit', summary: 'Quit?', action: 'press Ctrl-C again', card: <QuitConfirmCard /> });
    }

    if (state.commandUpdatePrompt) {
        const count = state.commandUpdatePrompt.length;
        notices.push({
            key: 'commands',
            summary: `${count} command${count === 1 ? '' : 's'} updated`,
            action: 'refresh? y/n',
            card: <CommandRefreshPrompt files={[...state.commandUpdatePrompt]} />
        });
    }

    if (state.error) {
        notices.push({
            key: 'error',
            summary: state.error.message, // status line only has room for one line
            action: RESTART,
            card: <ErrorDisplay error={state.error} />
        });
    }

    if (state.restartRequired) {
        notices.push({ key: 'restart', summary: '', action: RESTART, card: <RestartRequiredCard /> });
    }

    return notices;
}
