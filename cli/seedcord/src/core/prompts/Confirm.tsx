import { paint } from '@seedcord/errors';
import { Box, Text } from 'ink';
import React from 'react';

import { usePrompt } from './usePrompt';

import type { Outcome, PromptMachine } from './usePrompt';
import type { Key } from 'ink';
import type { ReactElement } from 'react';

export interface ConfirmPrompt {
    readonly message: string;
}

interface ConfirmProps extends ConfirmPrompt {
    readonly onEnd: (outcome: Outcome<boolean>) => void;
}

function isArrow(key: Key): boolean {
    return key.upArrow || key.downArrow || key.leftArrow || key.rightArrow;
}

const CONFIRM_MACHINE: PromptMachine<boolean, boolean> = {
    initial: false,
    press: (yes, { input, key }) => {
        if (input === 'y') return true;
        if (input === 'n') return false;
        if (isArrow(key)) return !yes;
        return yes;
    },
    answer: (yes) => yes
};

function option(label: string, picked: boolean): string {
    return picked ? paint.sky.underline(label) : paint.mute(label);
}

export function Confirm({ message, onEnd }: ConfirmProps): ReactElement {
    const yes = usePrompt(CONFIRM_MACHINE, onEnd);

    return (
        <Box paddingLeft={2}>
            <Text>
                {paint.sky('?')} {message} {option('yes', yes)} {paint.mute('/')} {option('no', !yes)}
            </Text>
        </Box>
    );
}
