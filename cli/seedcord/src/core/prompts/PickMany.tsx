import { paint } from '@seedcord/errors';
import { Box, Text } from 'ink';
import React from 'react';

import { includesIgnoreCase } from '#core/format';

import { ListCursor } from './ListCursor';
import { cursorRow, keyHints, question } from './rows';
import { usePrompt } from './usePrompt';

import type { Choice } from './Select';
import type { KeyPress, Outcome, PromptMachine } from './usePrompt';
import type { ReactElement } from 'react';

export interface PickManyPrompt<Value extends string> {
    readonly message: string;
    readonly choices: readonly Choice<Value>[];
}

interface PickManyProps<Value extends string> extends PickManyPrompt<Value> {
    readonly onEnd: (outcome: Outcome<Value[]>) => void;
}

// the row count clack used
const VISIBLE_ROWS = 10;

interface PickState<Value extends string> {
    readonly filter: string;
    readonly cursor: ListCursor<Choice<Value>>;
    readonly picked: ReadonlySet<Value>;
}

function toggle<Value extends string>(picked: ReadonlySet<Value>, value: Value): ReadonlySet<Value> {
    const next = new Set(picked);
    if (!next.delete(value)) next.add(value);
    return next;
}

function nextFilter(filter: string, { input, key }: KeyPress): string {
    // ink reports the \x7f a mac backspace sends as delete
    if (key.backspace || key.delete) return filter.slice(0, -1);
    if (input === '' || key.ctrl || key.meta || key.tab) return filter;
    return filter + input;
}

function pickManyMachine<Value extends string>(
    choices: readonly Choice<Value>[]
): PromptMachine<PickState<Value>, Value[]> {
    const filtered = (filter: string): ListCursor<Choice<Value>> =>
        new ListCursor(
            choices.filter(
                (choice) => includesIgnoreCase(choice.label, filter) || includesIgnoreCase(choice.value, filter)
            )
        );

    return {
        initial: { filter: '', cursor: new ListCursor(choices), picked: new Set() },
        press: (state, keyPress) => {
            const { key } = keyPress;
            if (key.upArrow) return { ...state, cursor: state.cursor.previous() };
            if (key.downArrow) return { ...state, cursor: state.cursor.next() };

            const current = state.cursor.current;
            if (key.tab && current) return { ...state, picked: toggle(state.picked, current.value) };

            const filter = nextFilter(state.filter, keyPress);
            return filter === state.filter ? state : { ...state, filter, cursor: filtered(filter) };
        },
        answer: ({ picked }) => choices.flatMap((choice) => (picked.has(choice.value) ? [choice.value] : []))
    };
}

const HINTS = keyHints({ '↑↓': 'move', tab: 'toggle', enter: 'done' });

function counts(picked: number, matches: number, total: number): string {
    const count = (value: number): string => paint.iris(String(value));
    return `${count(picked)} ${paint.mute('selected ·')} ${count(matches)} ${paint.mute('of')} ${count(total)} ${paint.mute('match')}`;
}

export function PickMany<Value extends string>({ message, choices, onEnd }: PickManyProps<Value>): ReactElement {
    const { filter, cursor, picked } = usePrompt(pickManyMachine(choices), onEnd);
    const { start, items } = cursor.window(VISIBLE_ROWS);

    return (
        <Box flexDirection="column" paddingLeft={2}>
            <Text>
                {question(message)} {paint.sky(filter)}
            </Text>
            {items.map((choice, offset) => {
                const box = picked.has(choice.value) ? paint.mint('■') : paint.mute('□');
                return (
                    <Text key={choice.value}>
                        {cursorRow(`${box} ${choice.label}`, start + offset === cursor.index)}
                    </Text>
                );
            })}
            <Text> {counts(picked.size, cursor.items.length, choices.length)}</Text>
            <Text> {HINTS}</Text>
        </Box>
    );
}
