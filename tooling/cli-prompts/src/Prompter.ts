import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import type { AutocompletePrompt } from './Autocomplete';
import type { ChecklistPrompt } from './Checklist';
import type { ConfirmPrompt } from './Confirm';
import type { PickManyPrompt } from './PickMany';
import type { promptViews } from './promptViews';
import type { SelectPrompt } from './Select';
import type { PasswordPrompt, TextPrompt } from './TextInput';
import type { Outcome } from './usePrompt';
import type { ReactElement } from 'react';

interface PromptStreams {
    readonly stdin: NodeJS.ReadableStream;
    readonly stdout: NodeJS.WritableStream;
}

type EndPrompt<Answer> = (outcome: Outcome<Answer>) => void;
type ViewOf<Answer> = (views: typeof promptViews, onEnd: EndPrompt<Answer>) => ReactElement;

export class Prompter {
    private readonly streams: PromptStreams;

    constructor({ stdin = process.stdin, stdout = process.stdout }: Partial<PromptStreams> = {}) {
        this.streams = { stdin, stdout };
    }

    public select<Value extends string>(prompt: SelectPrompt<Value>): Promise<Value> {
        return this.ask<Value>((views, onEnd) => views.select(prompt, onEnd));
    }

    public confirm(prompt: ConfirmPrompt): Promise<boolean> {
        return this.ask<boolean>((views, onEnd) => views.confirm(prompt, onEnd));
    }

    public pickMany<Value extends string>(prompt: PickManyPrompt<Value>): Promise<Value[]> {
        return this.ask<Value[]>((views, onEnd) => views.pickMany(prompt, onEnd));
    }

    public checklist<Value extends string>(prompt: ChecklistPrompt<Value>): Promise<Value[]> {
        return this.ask<Value[]>((views, onEnd) => views.checklist(prompt, onEnd));
    }

    public autocomplete<Value extends string>(prompt: AutocompletePrompt<Value>): Promise<Value> {
        return this.ask<Value>((views, onEnd) => views.autocomplete(prompt, onEnd));
    }

    public text(prompt: TextPrompt): Promise<string> {
        return this.ask<string>((views, onEnd) => views.text(prompt, onEnd));
    }

    public password(prompt: PasswordPrompt): Promise<string> {
        return this.ask<string>((views, onEnd) => views.password(prompt, onEnd));
    }

    private async ask<Answer>(view: ViewOf<Answer>): Promise<Answer> {
        // don't statically import these because ink loads react before seedcord build sets NODE_ENV
        const [{ render }, { promptViews: views }] = await Promise.all([import('ink'), import('./promptViews')]);

        const ended = Promise.withResolvers<Outcome<Answer>>();
        const app = render(view(views, ended.resolve), {
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
