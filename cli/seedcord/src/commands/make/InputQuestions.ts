import { assertNever } from '@seedcord/utils';

import type { Prompter } from '@seedcord/cli-prompts';
import type { InputShape, TemplateInputs } from '@seedcord/cli-templates';
import type { JsonObject, JsonValue } from 'type-fest';

// a prompt clears itself on submit
export type Answered = (label: string, shown: string) => void;

export class InputQuestions {
    constructor(
        private readonly prompter: Prompter,
        private readonly answered: Answered
    ) {}

    public ask(inputs: TemplateInputs): Promise<JsonObject> {
        return this.fields('', inputs);
    }

    private async value(label: string, shape: InputShape): Promise<JsonValue> {
        switch (shape.kind) {
            case 'text': {
                const text = await this.prompter.text({ message: label });
                this.answered(label, text);
                return text;
            }
            case 'bool': {
                const yes = await this.prompter.confirm({ message: label });
                this.answered(label, yes ? 'yes' : 'no');
                return yes;
            }
            case 'list': {
                return this.list(label, shape.item);
            }
            case 'object': {
                return this.fields(`${label}.`, shape.fields);
            }
            default: {
                return assertNever(shape);
            }
        }
    }

    private async list(label: string, item: InputShape): Promise<JsonValue[]> {
        if (item.kind === 'text') {
            const typed = await this.prompter.text({ message: label, placeholder: 'comma separated' });
            const items = typed
                .split(',')
                .map((part) => part.trim())
                .filter((part) => part !== '');
            this.answered(label, items.join(', '));
            return items;
        }

        const items: JsonValue[] = [];
        while (
            await this.prompter.confirm({ message: `Add ${items.length === 0 ? 'an' : 'another'} item to ${label}?` })
        ) {
            items.push(await this.value(`${label}[${items.length}]`, item));
        }
        return items;
    }

    private async fields(prefix: string, fields: TemplateInputs): Promise<JsonObject> {
        const answers: JsonObject = {};
        for (const [key, shape] of Object.entries(fields)) {
            answers[key] = await this.value(`${prefix}${key}`, shape);
        }
        return answers;
    }
}
