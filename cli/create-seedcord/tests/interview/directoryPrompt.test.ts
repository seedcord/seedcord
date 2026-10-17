import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { KEY, PromptTerminal, settled } from '@seedcord/cli-prompts/testing';
import { describe, expect, it } from 'vitest';

import { directoryStep } from '#interview/steps/directory';

describe('the folder question', () => {
    it('stays open on a folder that already has files', async () => {
        await using scratch = await mkdtempDisposable(join(tmpdir(), 'create-seedcord-folder-'));
        const taken = join(scratch.path, 'taken');
        await mkdir(taken);
        await writeFile(join(taken, 'notes.txt'), '');
        using terminal = new PromptTerminal();
        const answer = directoryStep.ask({}, terminal.prompter);

        await terminal.press(...taken, KEY.enter);
        // the long temp path wraps the message
        await settled(async () => {
            const screen = await terminal.screen();
            expect(screen.replaceAll(/\s+/g, ' ')).toContain('already has files');
        });

        await terminal.press(KEY.ctrlU, ...join(scratch.path, 'new-bot'), KEY.enter);
        await expect(answer).resolves.toBe(join(scratch.path, 'new-bot'));
    });
});
