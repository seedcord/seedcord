import { execFileSync } from 'node:child_process';
import { stripVTControlCharacters } from 'node:util';

import { describe, expect, it } from 'vitest';

import { parseInput } from '#cli/parseInput';
import { dashboardToggles, nextSteps as paintedSteps, reproducingCommand } from '#cli/summary';
import { version } from '#cli/version';
import { STEPS } from '#interview/steps';
import { BOT_TOKEN } from '#tests/token';

import type { ScaffoldAnswers } from '#template/context';

function shellWordsAfter(program: string, line: string): string[] {
    expect(line.startsWith(`${program} `)).toBe(true);

    const echo = String.raw`printf '%s\n' ${line.slice(program.length + 1)}`;
    return execFileSync('sh', ['-c', echo], { encoding: 'utf8' }).trimEnd().split('\n');
}

function nextSteps(...args: Parameters<typeof paintedSteps>): string[] {
    return paintedSteps(...args).map((step) => stripVTControlCharacters(step));
}

const GATEWAY: ScaffoldAnswers = {
    directory: 'my-bot',
    transport: 'gateway',
    capabilities: ['guild-messages'],
    token: BOT_TOKEN,
    testingGuilds: [],
    botColor: 'Blurple',
    install: true,
    git: true
};

const HTTP: ScaffoldAnswers = {
    directory: 'my-bot',
    transport: 'http',
    runtime: 'server',
    token: BOT_TOKEN,
    testingGuilds: [],
    botColor: 'Blurple',
    install: true,
    git: true
};

describe('nextSteps', () => {
    it('opens with the directory to change into', () => {
        expect(nextSteps(GATEWAY, { agent: 'pnpm', installed: true })[0]).toBe('cd my-bot');
    });

    it('keeps a spaced directory whole when a shell reads the cd line', () => {
        const [cd = ''] = nextSteps({ ...GATEWAY, directory: 'my bots/bot' }, { agent: 'pnpm', installed: true });

        expect(shellWordsAfter('cd', cd)).toEqual(['my bots/bot']);
    });

    it('uses the running package manager for the dev script', () => {
        expect(nextSteps(GATEWAY, { agent: 'npm', installed: true })).toContain('npm run dev');
        expect(nextSteps(GATEWAY, { agent: 'pnpm', installed: true })).toContain('pnpm run dev');
    });

    it('adds the install when the run skipped it', () => {
        const steps = nextSteps(GATEWAY, { agent: 'pnpm', installed: false });

        expect(steps).toContain('pnpm install');
        expect(steps.indexOf('pnpm install')).toBeLessThan(steps.indexOf('pnpm run dev'));
    });

    it('leaves the install out when it already ran', () => {
        expect(nextSteps(GATEWAY, { agent: 'pnpm', installed: true })).not.toContain('pnpm install');
    });

    it('asks for nothing in .env when every secret was pasted', () => {
        expect(nextSteps(HTTP, { agent: 'pnpm', installed: true }).join('\n')).not.toContain('.env');
    });

    it('lists a step to add the token to .env before the dev script when you skipped it', () => {
        const steps = nextSteps({ ...HTTP, token: null }, { agent: 'pnpm', installed: true });

        expect(steps).toContain('add DISCORD_BOT_TOKEN to .env');
        expect(steps.indexOf('add DISCORD_BOT_TOKEN to .env')).toBeLessThan(steps.indexOf('pnpm run dev'));
    });
});

describe('dashboardToggles', () => {
    it('says nothing for a bot that asked for no privileged intent', () => {
        expect(dashboardToggles(['guild-messages', 'reactions'])).toEqual([]);
    });

    it('names the toggle behind each privileged pick', () => {
        const lines = dashboardToggles(['message-text', 'members', 'presence']).join('\n');

        expect(lines).toContain('Message Content');
        expect(lines).toContain('Server Members');
        expect(lines).toContain('Presence');
    });

    it('points at the developer portal', () => {
        expect(dashboardToggles(['members']).join('\n')).toContain('https://discord.com/developers/applications');
    });

    it('says nothing on http, which has no intents', () => {
        expect(dashboardToggles([])).toEqual([]);
    });
});

describe('reproducingCommand', () => {
    it('reads back with no test servers through a shell that drops empty arguments', () => {
        const command = reproducingCommand({ ...HTTP, token: null }, 'pnpm');
        // windows powershell 5.1 passes no empty argument to a native program
        const [, ...args] = shellWordsAfter('pnpm create', command).filter((word) => word !== '');

        expect(parseInput(args)).toMatchObject({ testingGuilds: [], runtime: 'server', token: null });
    });

    it('keeps the secret out of the line', () => {
        const command = reproducingCommand(GATEWAY, 'pnpm');

        expect(command).not.toContain(BOT_TOKEN.value);
        expect(command).toContain('--token');
    });

    it('uses placeholders a shell will not choke on', () => {
        const command = reproducingCommand(HTTP, 'pnpm');

        expect(command).not.toMatch(/[<>|&;$`]/);
    });

    // pnpm can resolve @latest to an older release
    it('pins the version of itself that produced the project', () => {
        expect(reproducingCommand(GATEWAY, 'pnpm')).toMatch(/create seedcord@\d+\.\d+\.\d+ /);
    });

    it('carries every answer the run used', () => {
        const command = reproducingCommand(GATEWAY, 'pnpm');

        expect(command).toContain('my-bot');
        expect(command).toContain('--transport gateway');
        expect(command).toContain('--capabilities guild-messages');
        expect(command).toContain('--color Blurple');
    });

    it('answers every step a re-run would ask', () => {
        const command = reproducingCommand(HTTP, 'pnpm');
        // the directory goes in as the positional argument
        const flagged = STEPS.filter((step) => step.flag.name !== 'dir' && step.skip?.(HTTP) !== true);

        for (const step of flagged) {
            expect(command).toMatch(new RegExp(`--(no-)?${step.flag.name}( |=|$)`));
        }
    });

    it('carries a no to install or git as its --no- switch', () => {
        const command = reproducingCommand({ ...HTTP, install: false, git: false }, 'pnpm');

        expect(command).toContain('--no-install');
        expect(command).toContain('--no-git');
    });

    it('adds --no-token to the rerun command when you skipped the token', () => {
        const command = reproducingCommand({ ...HTTP, token: null }, 'pnpm');

        expect(command).toContain('--no-token');
        expect(command).not.toContain('YOUR_TOKEN');
    });

    it('keeps a hex color and a spaced directory whole when a shell reads the line', () => {
        const command = reproducingCommand({ ...HTTP, directory: 'my bots/bot', botColor: '#fe565a' }, 'pnpm');
        const words = shellWordsAfter('pnpm create', command);

        expect(words).toContain('my bots/bot');
        expect(words[words.indexOf('--color') + 1]).toBe('#fe565a');
        expect(words.at(-1)).toBe('--git');
    });

    it('leaves capabilities out on http', () => {
        expect(reproducingCommand(HTTP, 'pnpm')).not.toContain('--capabilities');
    });

    it('puts the double dash in for npm, which needs it before flags', () => {
        expect(reproducingCommand(GATEWAY, 'npm')).toContain(`npm create seedcord@${version} my-bot --`);
    });

    it('leaves the double dash out for every other manager', () => {
        expect(reproducingCommand(GATEWAY, 'pnpm')).not.toContain(' -- ');
    });
});
