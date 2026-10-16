import { paint } from '@seedcord/errors';
import { Box, Text } from 'ink';
import React, { useMemo } from 'react';

import { LineEditor } from './LineEditor';
import { editLine } from './lineKeys';
import { ListCursor } from './ListCursor';
import { matchChoices } from './matchChoices';
import { inListOrder, toggle } from './picks';
import { checkbox, cursorRow, keyHints, lineField, question } from './rows';
import { usePrompt } from './usePrompt';

import type { Choice } from './Choice';
import type { Outcome, PromptMachine } from './usePrompt';
import type { ReactElement } from 'react';

export interface PickManyPrompt<Value extends string> {
    readonly message: string;
    readonly choices: readonly Choice<Value>[];
}

interface PickManyProps<Value extends string> extends PickManyPrompt<Value> {
    readonly onEnd: (outcome: Outcome<Value[]>) => void;
}

const VISIBLE_ROWS = 10;

interface PickState<Value extends string> {
    readonly filter: LineEditor;
    readonly cursor: ListCursor<Choice<Value>>;
    readonly picked: ReadonlySet<Value>;
}

function pickManyMachine<Value extends string>(
    choices: readonly Choice<Value>[]
): PromptMachine<PickState<Value>, Value[]> {
    return {
        initial: { filter: LineEditor.empty(), cursor: new ListCursor(choices), picked: new Set() },
        press: (state, keyPress) => {
            const { key } = keyPress;
            if (key.upArrow) return { ...state, cursor: state.cursor.previous() };
            if (key.downArrow) return { ...state, cursor: state.cursor.next() };

            const current = state.cursor.current;
            if (key.tab && current) return { ...state, picked: toggle(state.picked, current.value) };

            const filter = editLine(state.filter, keyPress);
            if (filter.text === state.filter.text) return { ...state, filter };
            return { ...state, filter, cursor: new ListCursor(matchChoices(choices, filter.text)) };
        },
        submit: ({ picked }) => ({ answer: inListOrder(choices, picked) })
    };
}

const HINTS = keyHints({ '↑↓': 'move', tab: 'toggle', enter: 'done' });

function counts(picked: number, matches: number, total: number): string {
    const count = (value: number): string => paint.iris(String(value));
    return `${count(picked)} ${paint.mute('selected ·')} ${count(matches)} ${paint.mute('of')} ${count(total)} ${paint.mute('match')}`;
}

export function PickMany<Value extends string>({ message, choices, onEnd }: PickManyProps<Value>): ReactElement {
    const machine = useMemo(() => pickManyMachine(choices), [choices]);
    const { filter, cursor, picked } = usePrompt(machine, onEnd);
    const { start, items } = cursor.window(VISIBLE_ROWS);

    return (
        <Box flexDirection="column" paddingLeft={2}>
            <Text>
                {question(message)} {lineField(filter, 'type to search')}
            </Text>
            {items.map((choice, offset) => {
                const row = `${checkbox(picked.has(choice.value))} ${choice.label}`;
                return <Text key={choice.value}>{cursorRow(row, start + offset === cursor.index)}</Text>;
            })}
            <Box flexDirection="column" paddingLeft={2}>
                <Text>{counts(picked.size, cursor.items.length, choices.length)}</Text>
                <Text>{HINTS}</Text>
            </Box>
        </Box>
    );
}
