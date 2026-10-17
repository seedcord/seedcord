import { paint } from '@seedcord/errors';
import { Box, Text } from 'ink';
import React, { useMemo } from 'react';

import { question } from './rows';
import { usePrompt } from './usePrompt';

import type { Outcome, PromptMachine } from './usePrompt';
import type { Key } from 'ink';
import type { ReactElement } from 'react';

export interface ConfirmPrompt {
    readonly message: string;
    readonly initial?: boolean;
}

interface ConfirmProps extends ConfirmPrompt {
    readonly onEnd: (outcome: Outcome<boolean>) => void;
}

function isArrow(key: Key): boolean {
    return key.upArrow || key.downArrow || key.leftArrow || key.rightArrow;
}

function confirmMachine(initial: boolean): PromptMachine<boolean, boolean> {
    return {
        initial,
        press: (yes, { input, key }) => {
            const letter = input.toLowerCase();
            if (letter === 'y') return true;
            if (letter === 'n') return false;
            if (isArrow(key)) return !yes;
            return yes;
        },
        submit: (yes) => ({ answer: yes })
    };
}

function option(label: string, picked: boolean): string {
    return picked ? paint.sky.underline(label) : paint.mute(label);
}

export function Confirm({ message, initial = false, onEnd }: ConfirmProps): ReactElement {
    const machine = useMemo(() => confirmMachine(initial), [initial]);
    const yes = usePrompt(machine, onEnd);

    return (
        <Box paddingLeft={2}>
            <Text>
                {question(message)} {option('yes', yes)} {paint.mute('/')} {option('no', !yes)}
            </Text>
        </Box>
    );
}
