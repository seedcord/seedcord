import { useInput } from 'ink';
import { useEffect, useReducer } from 'react';

import type { Key } from 'ink';

export interface KeyPress {
    readonly input: string;
    readonly key: Key;
}

export interface PromptMachine<State, Answer> {
    readonly initial: State;
    readonly press: (state: State, keyPress: KeyPress) => State;
    // undefined leaves enter doing nothing
    readonly answer: (state: State) => Answer | undefined;
}

export type Outcome<Answer> = { readonly kind: 'answered'; readonly answer: Answer } | { readonly kind: 'cancelled' };

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

    const answer = machine.answer(progress.state);
    return answer === undefined ? progress : { ...progress, outcome: { kind: 'answered', answer } };
}

export function usePrompt<State, Answer>(
    machine: PromptMachine<State, Answer>,
    onEnd: (outcome: Outcome<Answer>) => void
): State {
    const [{ state, outcome }, press] = useReducer(
        (current: Progress<State, Answer>, keyPress: KeyPress) => advance(machine, current, keyPress),
        { state: machine.initial }
    );

    useInput((input, key) => press({ input, key }), { isActive: !outcome });

    useEffect(() => {
        if (outcome) onEnd(outcome);
    }, [outcome, onEnd]);

    return state;
}
