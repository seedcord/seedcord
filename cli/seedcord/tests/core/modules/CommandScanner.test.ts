import { mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { BuilderComponent, RegisterCommand } from '@seedcord/core';
import { describe, expect, it, onTestFinished } from 'vitest';

import { CommandScanner } from '#core/modules/CommandScanner';
import { silentLogger } from '#tests/silentLogger';

import type { ModuleLoader } from '#core/modules/ModuleLoader';

class BanCommand extends BuilderComponent<'command'> {
    public constructor() {
        super('command');
        this.instance.setName('ban').setDescription('Ban a member');
    }
}
RegisterCommand('global')(BanCommand);

async function commandsDir(): Promise<string> {
    const dir = await mkdtempDisposable(join(tmpdir(), 'scanner-'));
    onTestFinished(() => dir.remove());
    await writeFile(join(dir.path, 'Ban.ts'), '');
    return dir.path;
}

describe('CommandScanner', () => {
    it("keeps each command's builder and deploy meta", async () => {
        const dir = await commandsDir();
        const modules: ModuleLoader = { importModule: <TModule>() => Promise.resolve({ BanCommand } as TModule) };

        const [found] = await new CommandScanner(modules, silentLogger).scan(dir);

        expect(found?.component.name).toBe('ban');
        expect(found?.meta).toEqual({ scope: 'global' });
    });
});
