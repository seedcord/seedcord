import { log, select } from '@clack/prompts';

import { requireAnswer } from './requireAnswer';

import type { Step } from '../types';

export const JAVASCRIPT_REPLIES = [
    'weird flex. anyway, welcome to TypeScript.',
    'noted. ignored.',
    'respectfully, no.',
    'haha. anyway.',
    'checking with legal... they said TypeScript.',
    'ran that by the compiler. it hung up.',
    'hard to hear you over all these type errors.',
    "yeah... we don't do that here.",
    'bold of you.',
    'love the confidence.',
    'absolutely. one TypeScript project coming up.',
    'sure thing. TypeScript, as requested.',
    "you're gonna thank me in about a week.",
    'are you okay?'
] as const;

export function pickReply(random: () => number = Math.random): string {
    const index = Math.floor(random() * JAVASCRIPT_REPLIES.length);
    return JAVASCRIPT_REPLIES[index] ?? JAVASCRIPT_REPLIES[0];
}

export const languageStep: Step<'language'> = {
    key: 'language',
    flag: { name: 'language', parse: () => 'typescript' },
    ask: async () => {
        const picked = requireAnswer(
            await select<'typescript' | 'javascript'>({
                message: 'TypeScript or JavaScript?',
                options: [
                    { value: 'typescript', label: 'TypeScript' },
                    { value: 'javascript', label: 'JavaScript' }
                ]
            })
        );

        if (picked === 'javascript') log.info(pickReply());

        return 'typescript';
    }
};
