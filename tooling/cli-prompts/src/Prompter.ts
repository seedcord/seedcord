import { setImmediate } from 'node:timers/promises';

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
    readonly stdin: NodeJS.ReadableStream & { setRawMode: (mode: boolean) => unknown };
    readonly stdout: NodeJS.WritableStream;
}

function isMethod(value: unknown): value is (...args: unknown[]) => unknown {
    return typeof value === 'function';
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
        const { stdin } = this.streams;
        stdin.setRawMode(true);

        let outcome: Outcome<Answer>;
        try {
            outcome = await this.show(view);
        } finally {
            // windows keeps a process alive until enter while a cooked-mode console read is pending
            stdin.pause();
            // node stops the read one tick after the pause
            await setImmediate();
            stdin.setRawMode(false);
        }

        if (outcome.kind === 'cancelled') throw new SeedcordError(SeedcordErrorCode.CliCancelled);
        if (outcome.kind === 'failed') throw outcome.error;
        return outcome.answer;
    }

    private async show<Answer>(view: ViewOf<Answer>): Promise<Outcome<Answer>> {
        // don't statically import these because ink loads react before seedcord build sets NODE_ENV
        const [{ render }, { promptViews: views }] = await Promise.all([import('ink'), import('./promptViews')]);

        const ended = Promise.withResolvers<Outcome<Answer>>();
        const app = render(view(views, ended.resolve), {
            // ask() sets raw mode itself because ink turns it off while stdin is still reading
            stdin: new Proxy(this.streams.stdin, {
                get(target, key) {
                    if (key === 'setRawMode') return () => target;
                    const value: unknown = Reflect.get(target, key, target);
                    return isMethod(value) ? value.bind(target) : value;
                }
            }),
            stdout: this.streams.stdout,
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

        return outcome;
    }
}
