import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import type { Answers, Step } from '#interview/types';
import type { Choice } from '@seedcord/cli-prompts';

const TOOL_CHOICES = [
    { value: 'eslint', label: 'ESLint + Prettier', hint: 'standard seedcord setup with plugins' },
    { value: 'biome', label: 'Biome', hint: 'fast, unified linter and formatter' },
    { value: 'oxlint', label: 'Oxlint + Oxfmt', hint: 'blazingly fast Rust linter and formatter' }
] as const satisfies readonly Choice<Answers['tools']>[];

const TOOLS = TOOL_CHOICES.map(({ value }) => value);

function parseTools(raw: string): Answers['tools'] {
    const value = raw.trim().toLowerCase();
    const match = TOOLS.find((tool) => tool === value);
    if (!match) {
        throw new SeedcordTypeError(SeedcordErrorCode.CreateInvalidAnswer, [
            'tools',
            `Unknown tooling "${raw}". Pick eslint, biome, or oxlint.`
        ]);
    }

    return match;
}

export const toolsStep: Step<'tools'> = {
    key: 'tools',
    label: 'tools',
    flag: {
        name: 'tools',
        description: 'eslint, biome, or oxlint for linting and formatting',
        parse: parseTools
    },
    answerWithoutTerminal: 'eslint',
    ask: (_answers, prompter) =>
        prompter.select<Answers['tools']>({
            message: 'Which linter and formatter should your bot use?',
            choices: TOOL_CHOICES
        }),
    shown: (tools) => TOOL_CHOICES.find((choice) => choice.value === tools)?.label ?? tools
};
