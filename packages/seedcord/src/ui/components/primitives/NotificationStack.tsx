import { Box } from 'ink';
import React from 'react';

import { CommandRefreshPrompt } from '../CommandRefreshPrompt';
import { ErrorDisplay } from '../ErrorDisplay';
import { RestartRequiredCard } from '../RestartRequiredCard';

import type { ReactElement } from 'react';

interface NotificationStackProps {
    readonly error: Error | null;
    readonly restartRequired: boolean;
    readonly prompt: readonly string[] | null;
}

// Notification cards docked below the logs. Renders nothing when idle, so it adds no rows.
export function NotificationStack({ error, restartRequired, prompt }: NotificationStackProps): ReactElement | null {
    if (!error && !restartRequired && !prompt) return null;

    return (
        <Box flexShrink={0} flexDirection="column">
            {error ? <ErrorDisplay error={error} /> : null}
            {restartRequired ? <RestartRequiredCard /> : null}
            {prompt ? <CommandRefreshPrompt files={[...prompt]} /> : null}
        </Box>
    );
}
