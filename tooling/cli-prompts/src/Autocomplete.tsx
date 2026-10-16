import { Box, Text } from 'ink';
import React, { useMemo } from 'react';

import { LineEditor } from './LineEditor';
import { editLine } from './lineKeys';
import { ListCursor } from './ListCursor';
import { matchChoices } from './matchChoices';
import { cursorRow, hinted, keyHints, lineField, question } from './rows';
import { usePrompt } from './usePrompt';

import type { Choice } from './Choice';
import type { Outcome, PromptMachine } from './usePrompt';
import type { ReactElement } from 'react';

export interface AutocompletePrompt<Value extends string> {
    readonly message: string;
    readonly placeholder?: string;
    readonly choices: readonly Choice<Value>[];
    // listed above the matches
    readonly typedChoice?: (typed: string) => Choice<Value> | undefined;
}

interface AutocompleteProps<Value extends string> extends AutocompletePrompt<Value> {
    readonly onEnd: (outcome: Outcome<Value>) => void;
}

interface AutocompleteState<Value extends string> {
    readonly filter: LineEditor;
    readonly cursor: ListCursor<Choice<Value>>;
}

const VISIBLE_ROWS = 8;

function autocompleteMachine<Value extends string>(
    choices: readonly Choice<Value>[],
    typedChoice: AutocompletePrompt<Value>['typedChoice']
): PromptMachine<AutocompleteState<Value>, Value> {
    const choicesFor = (typed: string): ListCursor<Choice<Value>> => {
        const fromTyped = typedChoice?.(typed);
        const matched = matchChoices(choices, typed);
        return new ListCursor(fromTyped ? [fromTyped, ...matched] : matched);
    };

    return {
        initial: { filter: LineEditor.empty(), cursor: choicesFor('') },
        press: (state, keyPress) => {
            const { key } = keyPress;
            if (key.upArrow) return { ...state, cursor: state.cursor.previous() };
            if (key.downArrow) return { ...state, cursor: state.cursor.next() };

            const filter = editLine(state.filter, keyPress);
            if (filter.text === state.filter.text) return { ...state, filter };
            return { filter, cursor: choicesFor(filter.text) };
        },
        submit: (state) => (state.cursor.current ? { answer: state.cursor.current.value } : { stay: state })
    };
}

const HINTS = keyHints({ '↑↓': 'move', enter: 'pick' });

export function Autocomplete<Value extends string>({
    message,
    placeholder = 'type to search',
    choices,
    typedChoice,
    onEnd
}: AutocompleteProps<Value>): ReactElement {
    const machine = useMemo(() => autocompleteMachine(choices, typedChoice), [choices, typedChoice]);
    const { filter, cursor } = usePrompt(machine, onEnd);
    const { start, items } = cursor.window(VISIBLE_ROWS);

    return (
        <Box flexDirection="column" paddingLeft={2}>
            <Text>
                {question(message)} {lineField(filter, placeholder)}
            </Text>
            {items.map((choice, offset) => (
                <Text key={choice.value}>
                    {hinted(cursorRow(choice.label, start + offset === cursor.index), choice.hint)}
                </Text>
            ))}
            <Box paddingLeft={2}>
                <Text>{HINTS}</Text>
            </Box>
        </Box>
    );
}
