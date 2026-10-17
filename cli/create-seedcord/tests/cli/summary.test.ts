import { describe, expect, it } from 'vitest';

import { dashboardToggles, nextSteps, reproducingCommand } from '#cli/summary';
import { version } from '#cli/version';
import { STEPS } from '#interview/steps';

import type { ScaffoldAnswers } from '#template/context';

const GATEWAY: ScaffoldAnswers = {
    directory: 'my-bot',
    transport: 'gateway',
    capabilities: ['guild-messages'],
    token: 'aaa.bbb.ccc',
    botColor: 'Blurple',
    install: true,
    git: true
};

const HTTP: ScaffoldAnswers = {
    directory: 'my-bot',
    transport: 'http',
    token: 'aaa.bbb.ccc',
    botColor: 'Blurple',
    install: true,
    git: true
};

describe('nextSteps', () => {
    it('opens with the directory to change into', () => {
        expect(nextSteps(GATEWAY, { agent: 'pnpm', installed: true })[0]).toBe('cd my-bot');
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

    it('prints a step to add the token to .env before the dev script when you skipped it', () => {
        const steps = nextSteps({ ...HTTP, token: null }, { agent: 'pnpm', installed: true });
        const env = steps.findIndex((step) => step.includes('.env'));

        expect(steps[env]).toContain('DISCORD_BOT_TOKEN');
        expect(env).toBeLessThan(steps.indexOf('pnpm run dev'));
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
    it('keeps the secret out of the line', () => {
        const command = reproducingCommand(GATEWAY, 'pnpm');

        expect(command).not.toContain('aaa.bbb.ccc');
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
            expect(command).toMatch(new RegExp(`--(no-)?${step.flag.name}( |$)`));
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
