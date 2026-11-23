import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vite-plus/test';

import { ListPresenter } from '#commands/emojis/list/ListPresenter';
import { ListRunner } from '#commands/emojis/list/ListRunner';
import { EMOJI_STEPS } from '#commands/emojis/readEmojis';
import { quietSteps } from '#core/output/quietSteps';
import { StepPrinter } from '#core/output/StepPrinter';
import { APP_ID } from '#tests/commands/commands/fakeBot';
import { fakeEmojiDiscord, projectWith } from '#tests/commands/emojis/fakeEmojiDiscord';
import { fakeTerminal } from '#tests/fakeTerminal';

import type { ListOptions } from '#commands/emojis/list/ListRunner';
import type { FakeProject } from '#tests/commands/commands/fakeBot';

interface Listed {
    printed: () => string;
    done: Promise<void>;
}

async function runnerWith(files: Record<string, string>, onDiscord: string[]): Promise<[ListRunner, FakeProject]> {
    const project = await projectWith(files);
    const { rest } = fakeEmojiDiscord({ emojis: onDiscord });
    return [new ListRunner({ projectLoader: project, openDiscord: () => rest }), project];
}

function list(runner: ListRunner, { verbose = false, ...options }: ListOptions & { verbose?: boolean } = {}): Listed {
    const stdout = fakeTerminal();
    const printer = new StepPrinter({ command: 'emojis', labels: EMOJI_STEPS, verbose, stdout, stderr: stdout });
    return { printed: stdout.text, done: runner.run(new ListPresenter(printer, verbose), options) };
}

const FILES = { 'seed.png': 's', 'reactions/party_parrot.gif': 'p', 'wave.png': 'w' };

describe('emojis ListRunner', () => {
    it('groups the emojis by where they are', async () => {
        const [runner] = await runnerWith(FILES, ['seed', 'old_logo']);

        const { printed, done } = list(runner);
        await done;

        expect(printed()).toContain(
            [
                '  uploaded  1 emoji',
                '      seed',
                '',
                '  not uploaded  2 emojis',
                '    + party_parrot wave',
                '',
                '  only on Discord  1 emoji',
                '      old_logo',
                '',
                '  Run seedcord emojis push to upload the 2 that are missing.'
            ].join('\n')
        );
    });

    it('skips the push hint and the last group when the two sides match', async () => {
        const [runner] = await runnerWith({ 'seed.png': 's' }, ['seed']);

        const { printed, done } = list(runner);
        await done;

        expect(printed()).toContain('  uploaded  1 emoji\n      seed\n\n  not uploaded  0 emojis\n');
        expect(printed()).not.toContain('only on Discord');
        expect(printed()).not.toContain('seedcord emojis push');
    });

    it('puts each emoji on its own line with its key and id under --verbose', async () => {
        const [runner] = await runnerWith(FILES, ['seed', 'old_logo']);

        const { printed, done } = list(runner, { verbose: true });
        await done;

        expect(printed()).toContain('      seed  Emojis.Seed  seed-id\n');
        expect(printed()).toContain('    + party_parrot  Emojis.PartyParrot\n    + wave  Emojis.Wave\n');
        expect(printed()).toContain('      old_logo  old_logo-id\n');
    });

    it('prints the list under --check and then throws for each missing file', async () => {
        const [runner] = await runnerWith(FILES, ['seed']);

        const { printed, done } = list(runner, { check: true });

        await expect(done).rejects.toMatchObject({
            code: SeedcordErrorCode.ConfigEmojiUnresolved,
            errors: [{ code: SeedcordErrorCode.ConfigEmojiNotFound }, { code: SeedcordErrorCode.ConfigEmojiNotFound }]
        });
        expect(printed()).toContain('  not uploaded  2 emojis');
    });

    it('passes --check when every file is uploaded', async () => {
        const [runner] = await runnerWith({ 'seed.png': 's' }, ['seed', 'old_logo']);

        await expect(list(runner, { check: true }).done).resolves.toBeUndefined();
    });

    it('reads the same groups for --json', async () => {
        const [runner, project] = await runnerWith(FILES, ['seed', 'old_logo']);
        const folder = join(project.dir, 'emojis');

        expect(await runner.json(quietSteps, {})).toEqual({
            application: { id: APP_ID, name: 'seed beta' },
            folder,
            uploaded: [{ name: 'seed', key: 'Seed', id: 'seed-id', file: join(folder, 'seed.png'), mime: 'image/png' }],
            notUploaded: [
                {
                    name: 'party_parrot',
                    key: 'PartyParrot',
                    file: join(folder, 'reactions/party_parrot.gif'),
                    mime: 'image/gif'
                },
                { name: 'wave', key: 'Wave', file: join(folder, 'wave.png'), mime: 'image/png' }
            ],
            onlyOnDiscord: [{ name: 'old_logo', id: 'old_logo-id' }]
        });
    });
});
