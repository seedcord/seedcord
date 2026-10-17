import type { Step } from '#interview/types';

function yesOrNo(answer: boolean): string {
    return answer ? 'yes' : 'no';
}

export const installStep: Step<'install'> = {
    key: 'install',
    label: 'install',
    flag: { name: 'install', description: 'install dependencies', noFlag: 'skip installing dependencies' },
    answerWithoutTerminal: true,
    ask: (_answers, prompter) => prompter.confirm({ message: 'Install dependencies now?', initial: true }),
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
    ask: (_answers, prompter) => prompter.confirm({ message: 'Set up git with a first commit?', initial: true }),
    shown: yesOrNo
};
