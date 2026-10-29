import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { render } from 'ink';
import React from 'react';

import { Autocomplete } from './Autocomplete';
import { Checklist } from './Checklist';
import { Confirm } from './Confirm';
import { PickMany } from './PickMany';
import { Select } from './Select';
import { TextInput } from './TextInput';

import type { AutocompletePrompt } from './Autocomplete';
import type { ChecklistPrompt } from './Checklist';
import type { ConfirmPrompt } from './Confirm';
import type { PickManyPrompt } from './PickMany';
import type { SelectPrompt } from './Select';
import type { PasswordPrompt, TextPrompt } from './TextInput';
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

    public pickMany<Value extends string>(prompt: PickManyPrompt<Value>): Promise<Value[]> {
        return this.ask<Value[]>((onEnd) => <PickMany {...prompt} onEnd={onEnd} />);
    }

    public checklist<Value extends string>(prompt: ChecklistPrompt<Value>): Promise<Value[]> {
        return this.ask<Value[]>((onEnd) => <Checklist {...prompt} onEnd={onEnd} />);
    }

    public autocomplete<Value extends string>(prompt: AutocompletePrompt<Value>): Promise<Value> {
        return this.ask<Value>((onEnd) => <Autocomplete {...prompt} onEnd={onEnd} />);
    }

    public text(prompt: TextPrompt): Promise<string> {
        return this.ask<string>((onEnd) => <TextInput {...prompt} onEnd={onEnd} />);
    }

    public password(prompt: PasswordPrompt): Promise<string> {
        return this.ask<string>((onEnd) => <TextInput {...prompt} masked onEnd={onEnd} />);
    }

    private async ask<Answer>(prompt: (onEnd: EndPrompt<Answer>) => ReactElement): Promise<Answer> {
        const ended = Promise.withResolvers<Outcome<Answer>>();
        const app = render(prompt(ended.resolve), {
            ...this.streams,
            // ink draws only a final frame when CI is set
            interactive: true,
            exitOnCtrlC: false,
            patchConsole: false
        });

        const outcome = await ended.promise;
        // unmount draws whatever frame ink's render throttle still holds
        await app.waitUntilRenderFlush();
        // unmount alone leaves the last frame on screen
        app.clear();
        app.unmount();
        await app.waitUntilExit();

        if (outcome.kind === 'cancelled') throw new SeedcordError(SeedcordErrorCode.CliCancelled);
        if (outcome.kind === 'failed') throw outcome.error;
        return outcome.answer;
    }
}
