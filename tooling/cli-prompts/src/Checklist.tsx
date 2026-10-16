import { Box, Text } from 'ink';
import React, { useMemo } from 'react';

import { ListCursor } from './ListCursor';
import { inListOrder, toggle } from './picks';
import { checkbox, cursorRow, hinted, keyHints, question } from './rows';
import { usePrompt } from './usePrompt';

import type { Choice } from './Choice';
import type { Outcome, PromptMachine } from './usePrompt';
import type { ReactElement } from 'react';

export interface ChecklistPrompt<Value extends string> {
    readonly message: string;
    readonly choices: readonly Choice<Value>[];
}

interface ChecklistProps<Value extends string> extends ChecklistPrompt<Value> {
    readonly onEnd: (outcome: Outcome<Value[]>) => void;
}

interface ChecklistState<Value extends string> {
    readonly cursor: ListCursor<Choice<Value>>;
    readonly picked: ReadonlySet<Value>;
}

function checklistMachine<Value extends string>(
    choices: readonly Choice<Value>[]
): PromptMachine<ChecklistState<Value>, Value[]> {
    return {
        initial: { cursor: new ListCursor(choices), picked: new Set() },
        press: (state, { input, key }) => {
            if (key.upArrow) return { ...state, cursor: state.cursor.previous() };
            if (key.downArrow) return { ...state, cursor: state.cursor.next() };

            const current = state.cursor.current;
            if (input === ' ' && current) return { ...state, picked: toggle(state.picked, current.value) };
            return state;
        },
        submit: ({ picked }) => ({ answer: inListOrder(choices, picked) })
    };
}

const HINTS = keyHints({ '↑↓': 'move', space: 'toggle', enter: 'done' });

export function Checklist<Value extends string>({ message, choices, onEnd }: ChecklistProps<Value>): ReactElement {
    const machine = useMemo(() => checklistMachine(choices), [choices]);
    const { cursor, picked } = usePrompt(machine, onEnd);

    return (
        <Box flexDirection="column" paddingLeft={2}>
            <Text>{question(message)}</Text>
            {choices.map((choice, index) => (
                <Text key={choice.value}>
                    {hinted(
                        cursorRow(`${checkbox(picked.has(choice.value))} ${choice.label}`, index === cursor.index),
                        choice.hint
                    )}
                </Text>
            ))}
            <Box paddingLeft={2}>
                <Text>{HINTS}</Text>
            </Box>
        </Box>
    );
}
