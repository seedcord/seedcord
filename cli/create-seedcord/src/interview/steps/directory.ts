import { text } from '@clack/prompts';

import { requireAnswer } from './requireAnswer';

import type { Step } from '../types';

function parseDirectory(raw: string): string {
    const value = raw.trim();
    if (value === '') throw new Error('The project directory cannot be empty.');
    return value;
}

export const directoryStep: Step<'directory'> = {
    key: 'directory',
    flag: { name: 'dir', parse: parseDirectory },
    ask: async () =>
        parseDirectory(
            requireAnswer(
                await text({
                    message: 'Where should the project go?',
                    placeholder: 'my-bot',
                    validate: (value) => ((value ?? '').trim() === '' ? 'Enter a directory name.' : undefined)
                })
            )
        )
};
