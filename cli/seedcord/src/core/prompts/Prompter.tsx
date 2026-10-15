import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { render } from 'ink';
import React from 'react';

import { Confirm } from './Confirm';
import { Select } from './Select';

import type { ConfirmPrompt } from './Confirm';
import type { SelectPrompt } from './Select';
import type { Outcome } from './usePrompt';
import type { ReactElement } from 'react';

interface PromptStreams {
    readonly stdin: NodeJS.ReadableStream;
    readonly stdout: NodeJS.WritableStream;
}

type EndPrompt<Answer> = (outcome: Outcome<Answer>) => void;

export class Prompter {
    private readonly streams: PromptStreams;

    constructor({ stdin = process.stdin, stdout = process.stdout }: Partial<PromptStreams> = {}) {
        this.streams = { stdin, stdout };
    }

    public select<Value extends string>(prompt: SelectPrompt<Value>): Promise<Value> {
        return this.ask<Value>((onEnd) => <Select {...prompt} onEnd={onEnd} />);
    }

    public confirm(prompt: ConfirmPrompt): Promise<boolean> {
        return this.ask<boolean>((onEnd) => <Confirm {...prompt} onEnd={onEnd} />);
    }

    private async ask<Answer>(prompt: (onEnd: EndPrompt<Answer>) => ReactElement): Promise<Answer> {
        const ended = Promise.withResolvers<Outcome<Answer>>();
        const app = render(prompt(ended.resolve), { ...this.streams, exitOnCtrlC: false, patchConsole: false });

        const outcome = await ended.promise;
        // unmount alone leaves the last frame on screen
        app.clear();
        app.unmount();
        await app.waitUntilExit();

        if (outcome.kind === 'cancelled') throw new SeedcordError(SeedcordErrorCode.CliCancelled);
        return outcome.answer;
    }
}
