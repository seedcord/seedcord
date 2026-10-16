import { Box, Text } from 'ink';
import React, { useMemo } from 'react';

import { ListCursor } from './ListCursor';
import { cursorRow, hinted, question } from './rows';
import { usePrompt } from './usePrompt';

import type { Choice } from './Choice';
import type { Outcome, PromptMachine } from './usePrompt';
import type { ReactElement } from 'react';

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
        submit: (cursor) => (cursor.current ? { answer: cursor.current.value } : { stay: cursor })
    };
}

export function Select<Value extends string>({ message, choices, onEnd }: SelectProps<Value>): ReactElement {
    const machine = useMemo(() => selectMachine(choices), [choices]);
    const cursor = usePrompt(machine, onEnd);

    return (
        <Box flexDirection="column" paddingLeft={2}>
            <Text>{question(message)}</Text>
            {choices.map((choice, index) => (
                <Text key={choice.value}>{hinted(cursorRow(choice.label, index === cursor.index), choice.hint)}</Text>
            ))}
        </Box>
    );
}
