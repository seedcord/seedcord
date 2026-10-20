import { paint } from '@seedcord/errors';

import { runPrefix } from '#cli/packageManager';
import { version } from '#cli/version';
import { noFlagName } from '#interview/applyFlags';
import { privilegedFor } from '#interview/capabilities';

import type { ScaffoldAnswers } from '#template/context';
import type { BotToken } from '@seedcord/errors/internal';
import type { AgentName } from 'package-manager-detector';

const PORTAL = 'https://discord.com/developers/applications';

// discord labels the three toggles differently from the intents they turn on
const TOGGLE_LABELS: Record<string, string> = {
    GuildMembers: 'Server Members Intent',
    GuildPresences: 'Presence Intent',
    MessageContent: 'Message Content Intent'
};

const PLAIN_WORD = /^[\w@+=:./-]+$/;

// sh, powershell and cmd all read a double-quoted `#`, space or comma as part of one word
// parseDirectory refuses the characters that aren't safe on all major shells
function shellWord(value: string): string {
    return PLAIN_WORD.test(value) ? value : `"${value}"`;
}

export function nextSteps(answers: ScaffoldAnswers, run: { agent: AgentName; installed: boolean }): string[] {
    const install = run.installed ? [] : [paint.bold(`${run.agent} install`)];
    const fill = answers.token === null ? [paint.mute('add DISCORD_BOT_TOKEN to .env')] : [];

    const cd = paint.bold(`cd ${shellWord(answers.directory)}`);
    return [cd, ...install, ...fill, paint.bold(`${runPrefix(run.agent)} dev`)];
}

function secretFlag(value: BotToken | null, flag: string, placeholder: string): string {
    return value === null ? `--${noFlagName(flag)}` : `--${flag} ${placeholder}`;
}

function switchFlag(value: boolean, flag: string): string {
    return value ? `--${flag}` : `--${noFlagName(flag)}`;
}

export function dashboardToggles(capabilities: string[]): string[] {
    const privileged = privilegedFor(capabilities);
    if (privileged.length === 0) return [];

    const toggles = privileged.map((intent) => TOGGLE_LABELS[intent] ?? intent).join(', ');
    return [paint.amber(toggles), paint.mute(`turn on under Bot in ${PORTAL}`)];
}

// the token stays out because this line reaches scroll-back and screenshots
export function reproducingCommand(answers: ScaffoldAnswers, agent: AgentName): string {
    const flags = [
        `--transport ${answers.transport}`,
        answers.transport === 'gateway'
            ? `--capabilities ${shellWord(answers.capabilities.join(','))}`
            : `--runtime ${answers.runtime}`,
        secretFlag(answers.token, 'token', 'YOUR_TOKEN'),
        `--testing-guilds=${answers.testingGuilds.join(',')}`,
        `--color ${shellWord(answers.botColor)}`,
        switchFlag(answers.install, 'install'),
        switchFlag(answers.git, 'git')
    ];

    // npm alone forwards flags to the package through a double dash
    const separator = agent === 'npm' ? '-- ' : '';

    return `${agent} create seedcord@${version} ${shellWord(answers.directory)} ${separator}${flags.join(' ')}`;
}
