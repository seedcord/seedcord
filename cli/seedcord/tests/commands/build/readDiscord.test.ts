import { BuilderComponent } from '@seedcord/core';
import { SeedcordErrorCode } from '@seedcord/errors';
import { Routes } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';

import { readDiscord } from '#commands/build/builder/readDiscord';

import type { FoundCommand } from '#core/modules/CommandScanner';
import type { REST } from '@discordjs/rest';
import type { CommandMeta } from '@seedcord/core/internal';

const APP_ID = '100';
const PUBLIC_KEY = 'ab'.repeat(32);

class Ping extends BuilderComponent<'command'> {
    public constructor() {
        super('command');
        this.instance.setName('ping').setDescription('Replies with pong');
    }
}

function found(meta: CommandMeta = { scope: 'global' }): FoundCommand {
    const component = new Ping().component;
    return { sourceFile: '/bot/src/commands/Ping.ts', json: component.toJSON(), component, meta };
}

function deployed(id: string, name: string): { id: string; name: string; type: number } {
    return { id, name, type: 1 };
}

function restWith(routes: Record<string, unknown> = {}): Pick<REST, 'get'> {
    const answers: Record<string, unknown> = {
        [Routes.currentApplication()]: { id: APP_ID, verify_key: PUBLIC_KEY },
        ...routes
    };
    return {
        get: vi.fn((route: string) =>
            route in answers ? Promise.resolve(answers[route]) : Promise.reject(new Error(`unreachable ${route}`))
        )
    };
}

describe('readDiscord', () => {
    it("reads the application's public key", async () => {
        const read = await readDiscord({ rest: restWith(), commands: undefined, guilds: [], emojis: undefined });

        expect(read.ids.publicKey).toBe(PUBLIC_KEY);
    });

    it('resolves the configured emojis', async () => {
        const rest = restWith({ [Routes.applicationEmojis(APP_ID)]: { items: [{ name: 'wave', id: '55' }] } });

        const read = await readDiscord({ rest, commands: undefined, guilds: [], emojis: { Wave: 'wave' } });

        expect(read.ids.emojis.Wave?.id).toBe('55');
    });

    it('links a global command to its deployed id', async () => {
        const rest = restWith({ [Routes.applicationCommands(APP_ID)]: [deployed('7', 'ping')] });

        const read = await readDiscord({ rest, commands: [found()], guilds: [], emojis: undefined });

        expect(read.ids.commands.ping?.mention).toBe('</ping:7>');
    });

    it('returns each deployed command that no command in code matches', async () => {
        const rest = restWith({
            [Routes.applicationCommands(APP_ID)]: [deployed('7', 'ping'), deployed('9', 'probe')]
        });

        const read = await readDiscord({ rest, commands: [found()], guilds: [], emojis: undefined });

        expect(read.notInCode).toEqual([{ name: 'probe', type: 1 }]);
    });

    it('returns a command deployed to two guilds as multi-guild', async () => {
        const rest = restWith({
            [Routes.applicationCommands(APP_ID)]: [],
            [Routes.applicationGuildCommands(APP_ID, 'g1')]: [deployed('8', 'ping')],
            [Routes.applicationGuildCommands(APP_ID, 'g2')]: [deployed('9', 'ping')]
        });

        const read = await readDiscord({
            rest,
            commands: [found({ scope: 'config' })],
            guilds: ['g1', 'g2'],
            emojis: undefined
        });

        expect(read.multiGuild).toEqual([{ name: 'ping', type: 1 }]);
    });

    it('links a command deployed to the configured guild', async () => {
        const rest = restWith({
            [Routes.applicationCommands(APP_ID)]: [],
            [Routes.applicationGuildCommands(APP_ID, 'g1')]: [deployed('8', 'ping')]
        });

        const read = await readDiscord({
            rest,
            commands: [found({ scope: 'config' })],
            guilds: ['g1'],
            emojis: undefined
        });

        expect(read.ids.commands.ping?.id).toBe('8');
    });

    it('throws CliEdgeCommandsNotDeployed with each undeployed command and its file', async () => {
        const rest = restWith({ [Routes.applicationCommands(APP_ID)]: [] });

        const failure = await readDiscord({ rest, commands: [found()], guilds: [], emojis: undefined }).catch(
            (error: unknown) => error
        );

        expect(failure).toHaveProperty('code', SeedcordErrorCode.CliEdgeCommandsNotDeployed);
        expect(failure).toHaveProperty('message', expect.stringContaining('ping'));
        expect(failure).toHaveProperty('message', expect.stringContaining('Ping.ts'));
    });

    it("throws CliEdgeGuildCommandsUnreadable with the guild and discord's reason", async () => {
        const rest = restWith({ [Routes.applicationCommands(APP_ID)]: [] });

        const failure = await readDiscord({
            rest,
            commands: [found({ scope: 'guild', guilds: ['g9'] })],
            guilds: [],
            emojis: undefined
        }).catch((error: unknown) => error);

        expect(failure).toHaveProperty('code', SeedcordErrorCode.CliEdgeGuildCommandsUnreadable);
        expect(failure).toHaveProperty('message', expect.stringContaining('g9'));
        expect(failure).toHaveProperty('message', expect.stringContaining('unreachable'));
    });

    it('throws CliEdgeApplicationUnreadable when the token cannot read the application', async () => {
        const rest = { get: vi.fn(() => Promise.reject(new Error('401: Unauthorized'))) };

        const failure = await readDiscord({ rest, commands: undefined, guilds: [], emojis: undefined }).catch(
            (error: unknown) => error
        );

        expect(failure).toHaveProperty('code', SeedcordErrorCode.CliEdgeApplicationUnreadable);
        expect(failure).toHaveProperty('message', expect.stringContaining('401: Unauthorized'));
    });
});
