import type { Step } from '#interview/types';
import type { Prompter } from '@seedcord/cli-prompts';

const YES_NO = [
    { value: 'yes', label: 'Yes' },
    { value: 'no', label: 'No' }
] as const;

async function askYesNo(prompter: Prompter, message: string): Promise<boolean> {
    return (await prompter.select({ message, choices: YES_NO })) === 'yes';
}

function yesOrNo(answer: boolean): string {
    return answer ? 'yes' : 'no';
}

export const installStep: Step<'install'> = {
    key: 'install',
    label: 'install',
    flag: { name: 'install', description: 'install dependencies', noFlag: 'skip installing dependencies' },
    answerWithoutTerminal: true,
    ask: (_answers, prompter) => askYesNo(prompter, 'Install dependencies now?'),
    shown: yesOrNo
};

export const gitStep: Step<'git'> = {
    key: 'git',
    label: 'git',
    flag: {
        name: 'git',
        description: 'run git init and make the first commit',
        noFlag: 'skip git init and the first commit'
    },
    answerWithoutTerminal: true,
    ask: (_answers, prompter) => askYesNo(prompter, 'Set up git with a first commit?'),
    shown: yesOrNo
};
