import { basename, resolve } from 'node:path';

import { validatorFor } from '@seedcord/cli-prompts';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import { claimTarget } from '#scaffold/target';

import type { Step } from '#interview/types';

const PACKAGE_NAME = /^[a-z\d][a-z\d._-]*$/;
const FORMAT = 'lowercase, digits, and . _ -';

const MAX_NAME = 64;

// shells read these even inside the double quotes summary.ts prints the path in
const QUOTE_BREAKING = /[$`"!%]/;

function parseDirectory(raw: string): string {
    const value = raw.trim();
    if (value === '') {
        throw new SeedcordTypeError(SeedcordErrorCode.CreateInvalidAnswer, [
            'dir',
            'A project directory cannot be empty.'
        ]);
    }

    const breaking = QUOTE_BREAKING.exec(value)?.[0];
    if (breaking !== undefined) {
        throw new SeedcordTypeError(SeedcordErrorCode.CreateInvalidAnswer, [
            'dir',
            `Pick a path without ${breaking}. A shell reads it even inside the quotes of the commands printed at the end.`
        ]);
    }

    // context.ts copies the basename into package.json as the package name
    const name = basename(value);

    if (name.length > MAX_NAME) {
        throw new SeedcordTypeError(SeedcordErrorCode.CreateInvalidAnswer, [
            'dir',
            `Keep the folder name to ${MAX_NAME} characters or fewer.`
        ]);
    }

    if (!PACKAGE_NAME.test(name)) {
        throw new SeedcordTypeError(SeedcordErrorCode.CreateInvalidAnswer, [
            'dir',
            `The folder name becomes the package name. Use ${FORMAT}, starting with a letter or digit.`
        ]);
    }

    return value;
}

export const directoryStep: Step<'directory'> = {
    key: 'directory',
    label: 'folder',
    flag: { name: 'dir', description: 'where the project goes', parse: parseDirectory },
    ask: async (_answers, prompter) =>
        parseDirectory(
            await prompter.text({
                message: `Where should the project go? ${paint.mute(FORMAT)}`,
                placeholder: 'my-bot',
                validate: validatorFor(
                    [SeedcordErrorCode.CreateInvalidAnswer, SeedcordErrorCode.CreateTargetNotEmpty],
                    (value) => claimTarget(resolve(parseDirectory(value)))
                )
            })
        ),
    shown: (directory) => directory
};
