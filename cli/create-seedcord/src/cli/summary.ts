import { paint } from '@seedcord/errors';

import { runPrefix } from '#cli/packageManager';
import { version } from '#cli/version';
import { noFlagName } from '#interview/applyFlags';
import { privilegedFor } from '#interview/capabilities';

import type { ScaffoldAnswers } from '#template/context';
import type { AgentName } from 'package-manager-detector';

const PORTAL = 'https://discord.com/developers/applications';

// discord labels the three toggles differently from the intents they turn on
const TOGGLE_LABELS: Record<string, string> = {
    GuildMembers: 'Server Members Intent',
    GuildPresences: 'Presence Intent',
    MessageContent: 'Message Content Intent'
};

// the env.hbs keys a null answer leaves empty
function keysLeftEmpty(answers: ScaffoldAnswers): string[] {
    return [
        ...(answers.token === null ? ['DISCORD_BOT_TOKEN'] : []),
        ...(answers.publicKey === null ? ['DISCORD_PUBLIC_KEY'] : [])
    ];
}

export function nextSteps(answers: ScaffoldAnswers, run: { agent: AgentName; installed: boolean }): string[] {
    const prefix = runPrefix(run.agent);
    const install = run.installed ? [] : [`${run.agent} install`];
    const empty = keysLeftEmpty(answers);
    const fill = empty.length === 0 ? [] : [`fill in ${empty.join(' and ')} in .env`];

    return [`cd ${answers.directory}`, ...install, ...fill, `${prefix} dev`];
}

function secretFlag(value: string | null, flag: string, placeholder: string): string {
    return value === null ? `--${noFlagName(flag)}` : `--${flag} ${placeholder}`;
}

export function dashboardToggles(capabilities: string[]): string[] {
    const privileged = privilegedFor(capabilities);
    if (privileged.length === 0) return [];

    return [
        'Turn these on for your app under Bot, at',
        paint.sky(PORTAL),
        '',
        ...privileged.map((intent) => `  ${paint.amber(TOGGLE_LABELS[intent] ?? intent)}`)
    ];
}

// the token and public key stay out, since this line reaches scroll-back and screenshots
export function reproducingCommand(answers: ScaffoldAnswers, agent: AgentName): string {
    const flags = [
        `--transport ${answers.transport}`,
        ...(answers.capabilities === undefined ? [] : [`--capabilities ${answers.capabilities.join(',')}`]),
        secretFlag(answers.token, 'token', 'YOUR_TOKEN'),
        ...(answers.publicKey === undefined ? [] : [secretFlag(answers.publicKey, 'public-key', 'YOUR_PUBLIC_KEY')]),
        `--color ${answers.botColor}`
    ];

    // npm alone forwards flags to the package through a double dash
    const separator = agent === 'npm' ? '-- ' : '';

    return `${agent} create seedcord@${version} ${answers.directory} ${separator}${flags.join(' ')}`;
}
