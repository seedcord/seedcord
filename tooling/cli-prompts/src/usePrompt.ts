import { useInput } from 'ink';
import { useEffect, useReducer } from 'react';

import type { Key } from 'ink';

export interface KeyPress {
    readonly input: string;
    readonly key: Key;
}

type Submitted<State, Answer> = { readonly answer: Answer } | { readonly stay: State };

export interface PromptMachine<State, Answer> {
    readonly initial: State;
    readonly press: (state: State, keyPress: KeyPress) => State;
    readonly submit: (state: State) => Submitted<State, Answer>;
}

export type Outcome<Answer> =
    | { readonly kind: 'answered'; readonly answer: Answer }
    | { readonly kind: 'cancelled' }
    | { readonly kind: 'failed'; readonly error: unknown };

interface Progress<State, Answer> {
    readonly state: State;
    readonly outcome?: Outcome<Answer>;
}

function isCancel({ input, key }: KeyPress): boolean {
    return key.escape || (key.ctrl && input === 'c');
}

function advance<State, Answer>(
    machine: PromptMachine<State, Answer>,
    progress: Progress<State, Answer>,
    keyPress: KeyPress
): Progress<State, Answer> {
    if (progress.outcome) return progress;
    if (isCancel(keyPress)) return { ...progress, outcome: { kind: 'cancelled' } };
    if (!keyPress.key.return) return { state: machine.press(progress.state, keyPress) };

    try {
        const submitted = machine.submit(progress.state);
        return 'stay' in submitted
            ? { state: submitted.stay }
            : { ...progress, outcome: { kind: 'answered', answer: submitted.answer } };
    } catch (error: unknown) {
        // ink's input handler has no caller to rethrow to
        return { ...progress, outcome: { kind: 'failed', error } };
    }
}

const LINE_BREAK = /\r\n|\r|\n/u;

// ink reads a paste as one string, enter included
function keyPressesIn({ input, key }: KeyPress): KeyPress[] {
    if (key.return || !LINE_BREAK.test(input)) return [{ input, key }];

    const enter: KeyPress = { input: '\r', key: { ...key, return: true } };
    return input.split(LINE_BREAK).flatMap((text, index) => {
        const typed: KeyPress[] = text === '' ? [] : [{ input: text, key }];
        return index === 0 ? typed : [enter, ...typed];
    });
}

export function usePrompt<State, Answer>(
    machine: PromptMachine<State, Answer>,
    onEnd: (outcome: Outcome<Answer>) => void
): State {
    const [{ state, outcome }, press] = useReducer(
        (current: Progress<State, Answer>, keyPress: KeyPress) => advance(machine, current, keyPress),
        { state: machine.initial }
    );

    useInput(
        (input, key) => {
            for (const keyPress of keyPressesIn({ input, key })) press(keyPress);
        },
        { isActive: !outcome }
    );

    useEffect(() => {
        if (outcome) onEnd(outcome);
    }, [outcome, onEnd]);

    return state;
}
