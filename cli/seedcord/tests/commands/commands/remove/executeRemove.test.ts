import { stripVTControlCharacters } from 'node:util';

import { Routes } from 'discord-api-types/v10';
import { describe, expect, it, vi } from 'vitest';

import { CleanMode } from '#commands/commands/clean/CleanMode';
import { PurgeMode } from '#commands/commands/purge/PurgeMode';
import { executeRemove, LARGE_BOT_THRESHOLD } from '#commands/commands/remove/executeRemove';
import { RemovePresenter } from '#commands/commands/remove/RemovePresenter';
import { RemoveRunner } from '#commands/commands/remove/RemoveRunner';
import { APP_ID, botGuilds, fakeDiscord, slash } from '#tests/commands/commands/fakeBot';

import type { RemoveMode } from '#commands/commands/remove/RemoveMode';
import type { GuildTargets } from '#commands/commands/remove/scope';
import type { Mock } from 'vitest';

const ALPHA: GuildTargets = { kind: 'named', guilds: [{ id: '111', name: 'Alpha' }] };

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
    const output = {
        step: <Result>(_label: string, task: () => Promise<Result>) => task(),
        line: (text = '') => lines.push(stripVTControlCharacters(text)),
        wrapped: (text: string) => lines.push(stripVTControlCharacters(text)),
        warn: (text: string) => lines.push(text)
    };
    await executeRemove({
        ops: new RemoveRunner(() => discord.rest),
        mode,
        guilds,
        apply,
        token: 'token',
        presenter: new RemovePresenter(output, confirm, verbose)
    });
    return { ...discord, lines, confirm };
}

describe('executeRemove', () => {
    it('reports nothing to clean and never asks or deletes when nothing is selected', async () => {
        const { lines, confirm, deletes } = await run({ onDiscord: {} });

        expect(lines.at(-1)).toMatch(/Nothing to clean\.$/u);
        expect(confirm).not.toHaveBeenCalled();
        expect(deletes).toEqual([]);
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

    it('asks before scanning more guilds than one page holds, and stops when declined', async () => {
        const { confirm, gets } = await run({
            guilds: { kind: 'all' },
            answer: false,
            onDiscord: botGuilds(LARGE_BOT_THRESHOLD + 1)
        });

        expect(confirm).toHaveBeenCalledWith(expect.stringContaining(`${LARGE_BOT_THRESHOLD + 1} guilds`));
        expect(gets).not.toContain(Routes.applicationCommands(APP_ID));
    });

    it('scans without asking at or below one page of guilds', async () => {
        const { confirm, gets } = await run({
            guilds: { kind: 'all' },
            apply: false,
            onDiscord: botGuilds(LARGE_BOT_THRESHOLD)
        });

        expect(confirm).not.toHaveBeenCalled();
        expect(gets).toContain(Routes.applicationCommands(APP_ID));
    });
});
