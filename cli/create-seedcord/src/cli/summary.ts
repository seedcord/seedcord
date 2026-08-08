import { runPrefix } from '@cli/packageManager';
import { privilegedFor } from '@interview/capabilities';

import type { ScaffoldAnswers } from '@template/context';
import type { AgentName } from 'package-manager-detector';

const PORTAL = 'https://discord.com/developers/applications';

// discord labels the three toggles differently from the intents they turn on
const TOGGLE_LABELS: Record<string, string> = {
    GuildMembers: 'Server Members Intent',
    GuildPresences: 'Presence Intent',
    MessageContent: 'Message Content Intent'
};

export function nextSteps(answers: ScaffoldAnswers, run: { agent: AgentName; installed: boolean }): string[] {
    const prefix = runPrefix(run.agent);
    const install = run.installed ? [] : [`${run.agent} install`];

    return [`cd ${answers.directory}`, ...install, `${prefix} dev`];
}

export function dashboardToggles(capabilities: string[]): string[] {
    const privileged = privilegedFor(capabilities);
    if (privileged.length === 0) return [];

    return [
        'Turn these on for your app under Bot, at',
        PORTAL,
        '',
        ...privileged.map((intent) => `  ${TOGGLE_LABELS[intent] ?? intent}`)
    ];
}

// the token and public key stay out, since this line reaches scroll-back and screenshots
export function reproducingCommand(answers: ScaffoldAnswers, agent: AgentName): string {
    const flags = [
        `--transport ${answers.transport}`,
        ...(answers.capabilities === undefined ? [] : [`--capabilities ${answers.capabilities.join(',')}`]),
        '--token YOUR_TOKEN',
        ...(answers.publicKey === undefined ? [] : ['--public-key YOUR_PUBLIC_KEY']),
        `--color ${answers.botColor}`
    ];

    // npm alone forwards flags to the package through a double dash
    const separator = agent === 'npm' ? '-- ' : '';

    return `${agent} create seedcord ${answers.directory} ${separator}${flags.join(' ')}`;
}
