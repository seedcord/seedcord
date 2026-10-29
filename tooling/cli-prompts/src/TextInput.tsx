import { paint } from '@seedcord/errors';
import { Box, Text } from 'ink';
import React, { useMemo } from 'react';

import { LineEditor } from './LineEditor';
import { editLine } from './lineKeys';
import { lineField, question } from './rows';
import { usePrompt } from './usePrompt';

import type { Outcome, PromptMachine } from './usePrompt';
import type { ReactElement } from 'react';

export interface TextPrompt {
    readonly message: string;
    readonly placeholder?: string;
    // return a message to keep the prompt open. a throw rejects the prompt with that error
    readonly validate?: (value: string) => string | undefined;
    // shown on the first empty enter. the second one answers ''
    readonly emptyWarning?: string;
}

export type PasswordPrompt = Omit<TextPrompt, 'placeholder'>;

interface TextProps extends TextPrompt {
    readonly masked?: boolean;
    readonly onEnd: (outcome: Outcome<string>) => void;
}

const MASK = '•';

interface TextState {
    readonly line: LineEditor;
    readonly error?: string;
}

function textMachine(
    validate: TextPrompt['validate'],
    emptyWarning: TextPrompt['emptyWarning']
): PromptMachine<TextState, string> {
    return {
        initial: { line: LineEditor.empty() },
        press: ({ line }, keyPress) => ({ line: editLine(line, keyPress) }),
        submit: ({ line, error: shown }) => {
            if (line.text.trim() === '' && emptyWarning !== undefined) {
                return shown === emptyWarning ? { answer: '' } : { stay: { line, error: emptyWarning } };
            }
            const error = validate?.(line.text);
            return error === undefined ? { answer: line.text } : { stay: { line, error } };
        }
    };
}

export function TextInput({
    message,
    placeholder = '',
    validate,
    emptyWarning,
    masked = false,
    onEnd
}: TextProps): ReactElement {
    const machine = useMemo(() => textMachine(validate, emptyWarning), [validate, emptyWarning]);
    const { line, error } = usePrompt(machine, onEnd);

    return (
        <Box flexDirection="column" paddingLeft={2}>
            <Text>
                {question(message)} {lineField(masked ? line.masked(MASK) : line, placeholder)}
            </Text>
            {error ? <Text>{`  ${paint.amber(error)}`}</Text> : null}
        </Box>
    );
}
