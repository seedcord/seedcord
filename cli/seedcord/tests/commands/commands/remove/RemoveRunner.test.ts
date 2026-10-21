import { stripVTControlCharacters } from 'node:util';

import { SeedcordErrorCode } from '@seedcord/errors';
import { Routes } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';

import { CleanMode } from '#commands/commands/clean/CleanMode';
import { PurgeMode } from '#commands/commands/purge/PurgeMode';
import { RemovePresenter } from '#commands/commands/remove/RemovePresenter';
import { RemoveRunner } from '#commands/commands/remove/RemoveRunner';
import { APP_ID, fakeDiscord, removeDeps, slash } from '#tests/commands/commands/fakeBot';

import type { RemoveMode } from '#commands/commands/remove/RemoveMode';
import type { GuildTargets } from '#commands/commands/scope';
import type { Mock } from 'vitest';

const ALPHA: GuildTargets = { kind: 'named', ids: ['111'] };

const ON_DISCORD = {
    [Routes.applicationCommands(APP_ID)]: [slash('ban')],
    [Routes.applicationGuildCommands(APP_ID, '111')]: [slash('ban'), slash('setup')]
};

interface RunOptions {
    mode?: RemoveMode;
    guilds?: GuildTargets;
    apply?: boolean;
    answer?: boolean;
    verbose?: boolean;
    onDiscord?: Record<string, unknown>;
}

interface Run extends ReturnType<typeof fakeDiscord> {
    lines: string[];
    confirm: Mock<(message: string) => Promise<boolean>>;
}

async function run({
    mode = new CleanMode(),
    guilds = ALPHA,
    apply = true,
    answer = true,
    verbose = false,
    onDiscord = ON_DISCORD
}: RunOptions = {}): Promise<Run> {
    const discord = fakeDiscord(onDiscord);
    const lines: string[] = [];
    const confirm = vi.fn((_message: string) => Promise.resolve(answer));
    const runner = new RemoveRunner(removeDeps(discord.rest));
    await runner.run(new RemovePresenter(outputInto(lines), confirm, verbose), { mode, guilds, apply });
    return { ...discord, lines, confirm };
}

function outputInto(lines: string[]): ConstructorParameters<typeof RemovePresenter>[0] {
    return {
        step: <Result>(_label: string, task: () => Promise<Result>) => task(),
        detail: () => undefined,
        line: (text = '') => lines.push(stripVTControlCharacters(text)),
        wrapped: (text: string) => lines.push(stripVTControlCharacters(text)),
        warn: (text: string) => lines.push(text)
    };
}

describe('RemoveRunner.run', () => {
    it('reports nothing to clean and never asks or deletes when nothing is selected', async () => {
        const { lines, confirm, deletes } = await run({ onDiscord: {} });

        expect(lines.at(-1)).toMatch(/Nothing to clean\.$/u);
        expect(confirm).not.toHaveBeenCalled();
        expect(deletes).toEqual([]);
    });

    it('throws CoreDiscordReadFailed before it deletes anything when a guild cannot be read', async () => {
        const discord = fakeDiscord({
            ...ON_DISCORD,
            [Routes.applicationGuildCommands(APP_ID, '222')]: new Error('Missing Access')
        });
        const presenter = new RemovePresenter(outputInto([]), () => Promise.resolve(true), false);

        const removal = new RemoveRunner(removeDeps(discord.rest)).run(presenter, {
            mode: new CleanMode(),
            guilds: { kind: 'named', ids: ['111', '222'] },
            apply: true
        });

        await expect(removal).rejects.toMatchObject({ code: SeedcordErrorCode.CoreDiscordReadFailed });
        expect(discord.deletes).toEqual([]);
    });

    it('warns about each command it could not delete, then throws CliCommandsNotDeleted', async () => {
        const discord = fakeDiscord({
            ...ON_DISCORD,
            [Routes.applicationGuildCommands(APP_ID, '222')]: [slash('ban')],
            [Routes.applicationGuildCommand(APP_ID, '111', 'ban-id')]: new Error('Unknown Command')
        });
        const lines: string[] = [];
        const presenter = new RemovePresenter(outputInto(lines), () => Promise.resolve(true), false);

        const removal = new RemoveRunner(removeDeps(discord.rest)).run(presenter, {
            mode: new CleanMode(),
            guilds: { kind: 'named', ids: ['111', '222'] },
            apply: true
        });

        await expect(removal).rejects.toMatchObject({ code: SeedcordErrorCode.CliCommandsNotDeleted });
        expect(lines).toContain('Could not delete ban in Alpha (Unknown Command).');
        expect(discord.deletes).toEqual([Routes.applicationGuildCommand(APP_ID, '222', 'ban-id')]);
    });

    it('lists what it found and says how to delete it on a dry run', async () => {
        const { lines, confirm, deletes } = await run({ apply: false });

        expect(lines).toContain('/ban');
        expect(lines).toContain('Dry run. Re-run with --yes to delete these.');
        expect(confirm).not.toHaveBeenCalled();
        expect(deletes).toEqual([]);
    });

    it('shows each command on its own line with its id under --verbose', async () => {
        const { lines } = await run({ apply: false, verbose: true });

        expect(lines).toContain('/ban  ban-id');
    });

    it('asks before it deletes, then deletes the duplicates and leaves global alone', async () => {
        const { confirm, deletes, lines } = await run();

        expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Delete 1 command?'));
        expect(deletes).toEqual([Routes.applicationGuildCommand(APP_ID, '111', 'ban-id')]);
        expect(lines.at(-1)).toBe('Global commands untouched.');
    });

    it('deletes nothing when the delete is declined', async () => {
        const { deletes, lines } = await run({ answer: false });

        expect(deletes).toEqual([]);
        expect(lines.at(-1)).toBe('Nothing deleted.');
    });

    it('clears global and each guild with purge, and leaves out the untouched line', async () => {
        const { puts, lines, confirm } = await run({ mode: new PurgeMode(true) });

        expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Delete 3 commands?'));
        expect(puts.map(({ route }) => route)).toEqual([
            Routes.applicationCommands(APP_ID),
            Routes.applicationGuildCommands(APP_ID, '111')
        ]);
        expect(lines).not.toContain('Global commands untouched.');
    });

    it('purges only global when no guild is targeted', async () => {
        const { puts, gets } = await run({ mode: new PurgeMode(true), guilds: { kind: 'none' } });

        expect(puts.map(({ route }) => route)).toEqual([Routes.applicationCommands(APP_ID)]);
        expect(gets).not.toContain(Routes.applicationGuildCommands(APP_ID, '111'));
    });
});
