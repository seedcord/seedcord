import { paint } from '@seedcord/errors';
import { Box, Text } from 'ink';
import React from 'react';

import { ListCursor } from './ListCursor';
import { usePrompt } from './usePrompt';

import type { Outcome, PromptMachine } from './usePrompt';
import type { ReactElement } from 'react';

export interface Choice<Value extends string> {
    readonly value: Value;
    readonly label: string;
    readonly hint?: string;
}

export interface SelectPrompt<Value extends string> {
    readonly message: string;
    readonly choices: readonly Choice<Value>[];
}

interface SelectProps<Value extends string> extends SelectPrompt<Value> {
    readonly onEnd: (outcome: Outcome<Value>) => void;
}

function selectMachine<Value extends string>(
    choices: readonly Choice<Value>[]
): PromptMachine<ListCursor<Choice<Value>>, Value> {
    return {
        initial: new ListCursor(choices),
        press: (cursor, { key }) => {
            if (key.upArrow) return cursor.previous();
            if (key.downArrow) return cursor.next();
            return cursor;
        },
        answer: (cursor) => cursor.current?.value
    };
}

export function Select<Value extends string>({ message, choices, onEnd }: SelectProps<Value>): ReactElement {
    const cursor = usePrompt(selectMachine(choices), onEnd);

    return (
        <Box flexDirection="column" paddingLeft={2}>
            <Text>
                {paint.sky('?')} {message}
            </Text>
            {choices.map((choice, index) => (
                <Text key={choice.value}>
                    {'  '}
                    {index === cursor.index ? `${paint.sky('❯')} ${paint.bold(choice.label)}` : `  ${choice.label}`}
                    {choice.hint ? `  ${paint.mute(choice.hint)}` : ''}
                </Text>
            ))}
        </Box>
    );
}
