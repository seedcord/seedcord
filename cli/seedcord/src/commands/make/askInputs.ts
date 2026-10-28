import { assertNever } from '@seedcord/utils';

import type { Prompter } from '@seedcord/cli-prompts';
import type { InputShape, TemplateInputs } from '@seedcord/cli-templates';
import type { JsonObject, JsonValue } from 'type-fest';

async function askList(prompter: Prompter, label: string, item: InputShape): Promise<JsonValue[]> {
    if (item.kind === 'text') {
        const typed = await prompter.text({ message: label, placeholder: 'comma separated' });
        return typed
            .split(',')
            .map((part) => part.trim())
            .filter((part) => part !== '');
    }

    const items: JsonValue[] = [];
    while (await prompter.confirm({ message: `Add ${items.length === 0 ? 'one' : 'another'} to ${label}?` })) {
        items.push(await askValue(prompter, `${label}[${items.length}]`, item));
    }
    return items;
}

async function askValue(prompter: Prompter, label: string, shape: InputShape): Promise<JsonValue> {
    switch (shape.kind) {
        case 'text': {
            return prompter.text({ message: label });
        }
        case 'bool': {
            return prompter.confirm({ message: label });
        }
        case 'list': {
            return askList(prompter, label, shape.item);
        }
        case 'object': {
            return askFields(prompter, `${label}.`, shape.fields);
        }
        default: {
            return assertNever(shape);
        }
    }
}

async function askFields(prompter: Prompter, prefix: string, fields: TemplateInputs): Promise<JsonObject> {
    const answers: JsonObject = {};
    for (const [key, shape] of Object.entries(fields)) {
        answers[key] = await askValue(prompter, `${prefix}${key}`, shape);
    }
    return answers;
}

export function askInputs(prompter: Prompter, inputs: TemplateInputs): Promise<JsonObject> {
    return askFields(prompter, '', inputs);
}
