import React from 'react';

import { plural } from '#core/format';
import { CommandRefreshPrompt } from '#ui/components/CommandRefreshPrompt';
import { ConfirmCard } from '#ui/components/ConfirmCard';
import { ErrorDisplay } from '#ui/components/ErrorDisplay';
import { RestartRequiredCard } from '#ui/components/RestartRequiredCard';
import { TunnelOpeningCard } from '#ui/components/TunnelOpeningCard';
import { CONFIRMS, confirmKeyLabel } from '#ui/confirms';

import type { TunnelPhase, TunnelStatus } from '#commands/dev/tunnel/TunnelCoordinator';
import type { Confirmable } from '#ui/confirms';
import type { DevState } from '#ui/stores/DevStore';
import type { ReactElement } from 'react';

type NoticeKey = Confirmable | 'commands' | 'error' | 'restart' | 'tunnel';

export interface Notice {
    readonly key: NoticeKey;
    /** Description shown on the status line's left side. */
    readonly summary: string;
    /** What to press. */
    readonly action: string;
    readonly card: ReactElement;
}

const RESTART = 'press r to restart';

function openingPhase(status: TunnelStatus | null): TunnelPhase | null {
    return status === null || status === 'live' || status === 'lost' ? null : status;
}

/** Every pending notice, ranked with the one that blocks a decision first. */
export function noticesOf(state: DevState): readonly Notice[] {
    const notices: Notice[] = [];

    if (state.armed) {
        notices.push({
            key: state.armed,
            summary: CONFIRMS[state.armed].title,
            action: `press ${confirmKeyLabel(state.armed)} again`,
            card: <ConfirmCard confirm={state.armed} />
        });
    }

    if (state.commandUpdatePrompt) {
        const count = state.commandUpdatePrompt.length;
        notices.push({
            key: 'commands',
            summary: `${plural(count, 'command')} updated`,
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

    const phase = openingPhase(state.tunnel);
    if (phase) {
        notices.push({
            key: 'tunnel',
            summary: 'Setting up your interactions endpoint',
            action: 'hold on',
            card: <TunnelOpeningCard phase={phase} />
        });
    }

    return notices;
}
