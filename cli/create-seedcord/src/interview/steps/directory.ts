import { basename } from 'node:path';

import { text } from '@clack/prompts';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { requireAnswer } from './requireAnswer';

import type { Step } from '#interview/types';

const PACKAGE_NAME = /^[a-z\d][a-z\d._-]*$/;
const FORMAT = 'lowercase, digits, and . _ -';

const MAX_NAME = 64;

function parseDirectory(raw: string): string {
    const value = raw.trim();
    if (value === '') {
        throw new SeedcordError(SeedcordErrorCode.CreateInvalidAnswer, ['dir', 'A project directory cannot be empty.']);
    }

    // context.ts copies the basename into package.json as the package name
    const name = basename(value);

    if (name.length > MAX_NAME) {
        throw new SeedcordError(SeedcordErrorCode.CreateInvalidAnswer, [
            'dir',
            `Keep the folder name to ${MAX_NAME} characters or fewer.`
        ]);
    }

    if (!PACKAGE_NAME.test(name)) {
        throw new SeedcordError(SeedcordErrorCode.CreateInvalidAnswer, [
            'dir',
            `The folder name becomes the package name. Use ${FORMAT}, starting with a letter or digit.`
        ]);
    }

    return value;
}

export const directoryStep: Step<'directory'> = {
    key: 'directory',
    flag: { name: 'dir', description: 'where the project goes', parse: parseDirectory },
    ask: async () =>
        parseDirectory(
            requireAnswer(
                await text({
                    message: `Where should the project go? ${paint.mute(FORMAT)}`,
                    placeholder: 'my-bot',
                    validate: (value) => {
                        try {
                            parseDirectory(value ?? '');
                            return undefined;
                        } catch (error) {
                            return Error.isError(error) ? error.message : 'Enter a directory name.';
                        }
                    }
                })
            )
        )
};
