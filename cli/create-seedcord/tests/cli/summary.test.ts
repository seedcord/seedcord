import { describe, expect, it } from 'vitest';

import { dashboardToggles, nextSteps, reproducingCommand } from '@cli/summary';
import { STEPS } from '@interview/steps';

import type { ScaffoldAnswers } from '@template/context';

const GATEWAY: ScaffoldAnswers = {
    directory: 'my-bot',
    language: 'typescript',
    transport: 'gateway',
    capabilities: ['guild-messages'],
    token: 'aaa.bbb.ccc',
    botColor: 'Blurple'
};

const HTTP: ScaffoldAnswers = {
    directory: 'my-bot',
    language: 'typescript',
    transport: 'http',
    token: 'aaa.bbb.ccc',
    publicKey: 'a'.repeat(64),
    botColor: 'Blurple'
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

    it('keeps the public key out too', () => {
        expect(reproducingCommand(HTTP, 'pnpm')).not.toContain('a'.repeat(64));
    });

    it('carries every answer the run used', () => {
        const command = reproducingCommand(GATEWAY, 'pnpm');

        expect(command).toContain('my-bot');
        expect(command).toContain('--language typescript');
        expect(command).toContain('--transport gateway');
        expect(command).toContain('--capabilities guild-messages');
        expect(command).toContain('--color Blurple');
    });

    it('answers every step a re-run would ask', () => {
        const command = reproducingCommand(HTTP, 'pnpm');
        // the directory goes in as the positional argument
        const flagged = STEPS.filter((step) => step.flag.name !== 'dir' && step.skip?.(HTTP) !== true);

        for (const step of flagged) {
            expect(command).toContain(`--${step.flag.name} `);
        }
    });

    it('leaves capabilities out on http', () => {
        expect(reproducingCommand(HTTP, 'pnpm')).not.toContain('--capabilities');
    });

    it('leaves the public key flag out on gateway', () => {
        expect(reproducingCommand(GATEWAY, 'pnpm')).not.toContain('--public-key');
    });

    it('puts the double dash in for npm, which needs it before flags', () => {
        expect(reproducingCommand(GATEWAY, 'npm')).toContain('npm create seedcord my-bot --');
    });

    it('leaves the double dash out for every other manager', () => {
        expect(reproducingCommand(GATEWAY, 'pnpm')).not.toContain(' -- ');
    });
});
