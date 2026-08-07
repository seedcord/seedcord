import { log, select } from '@clack/prompts';

import { requireAnswer } from './requireAnswer';

import type { Step } from '../types';

export const JAVASCRIPT_REPLIES = [
    'weird flex. anyway, welcome to TypeScript.',
    'noted. ignored. TypeScript.',
    'TypeScript. respectfully.',
    'haha. TypeScript then.',
    'checking with legal... they said TypeScript.',
    'ran that by the compiler. it hung up and started a TypeScript project.',
    'hard to hear you over all these type errors. TypeScript should clear those up.',
    "yeah... we don't do that here. TypeScript we can do.",
    'bold of you. enjoy your TypeScript.',
    'love the confidence. TypeScript will test it.',
    'absolutely. one TypeScript project coming up.',
    'sure thing. TypeScript, as requested.',
    "you're gonna thank me for overriding this with TypeScript in about a week.",
    'are you okay? here, have some TypeScript.',
    'heard you. picked TypeScript anyway.'
] as const;

export function pickReply(random: () => number = Math.random): string {
    const index = Math.floor(random() * JAVASCRIPT_REPLIES.length);
    return JAVASCRIPT_REPLIES[index] ?? JAVASCRIPT_REPLIES[0];
}

export const languageStep: Step<'language'> = {
    key: 'language',
    flag: { name: 'language', description: 'accepted, then overrides with typescript', parse: () => 'typescript' },
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
