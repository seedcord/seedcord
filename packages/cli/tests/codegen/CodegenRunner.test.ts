import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { SeedcordBrand } from '@seedcord/types/internal';
import { afterEach, describe, expect, it } from 'vitest';

import { CodegenRunner } from '@commands/codegen/CodegenRunner';
import { SlashTableGenerator } from '@commands/codegen/SlashTableGenerator';

import type { ConfigLoader } from '@core/config/ConfigLoader';
import type { ConfigLocator } from '@core/config/ConfigLocator';
import type { ModuleLoader } from '@core/modules/ModuleLoader';
import type { ILogger } from '@seedcord/types';

const OUTPUT = 'slash-registry.gen.ts';

function silentLogger(overrides: Partial<ILogger> = {}): ILogger {
    return {
        error: () => undefined,
        warn: () => undefined,
        info: () => undefined,
        http: () => undefined,
        verbose: () => undefined,
        debug: () => undefined,
        silly: () => undefined,
        ...overrides
    };
}

// fixture doubles: only locate()/load()/importModule() are exercised, and the instance has no commands path
// so the scan is empty and the rendered registry is deterministic.
function makeRunner(root: string, logger: ILogger): CodegenRunner {
    const locator = { locate: () => resolve(root, 'seedcord.config.ts') } as unknown as ConfigLocator;
    const configLoader = {
        load: () => Promise.resolve({ root, instance: resolve(root, 'bot.ts') })
    } as unknown as ConfigLoader;
    const moduleLoader = {
        importModule: () =>
            Promise.resolve({ default: { [SeedcordBrand]: true, config: { bot: { commands: { path: null } } } } })
    } as unknown as ModuleLoader;

    return new CodegenRunner(locator, configLoader, moduleLoader, new SlashTableGenerator(logger), logger);
}

describe('CodegenRunner', () => {
    afterEach(() => {
        process.exitCode = 0;
    });

    it('writes the rendered registry to the project root', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
        await makeRunner(root, silentLogger()).run(false);

        const written = await readFile(resolve(root, OUTPUT), 'utf8');
        expect(written).toContain("declare module 'seedcord'");
    });

    it('--check exits non-zero and names the fix when the registry is stale', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
        await writeFile(resolve(root, OUTPUT), 'stale content', 'utf8');

        const errors: string[] = [];
        await makeRunner(root, silentLogger({ error: (message) => errors.push(String(message)) })).run(true);

        expect(process.exitCode).toBe(1);
        expect(errors.join('\n')).toContain('seedcord codegen');
    });

    it('--check exits zero when the registry matches', async () => {
        const root = await mkdtemp(join(tmpdir(), 'codegen-'));
        await makeRunner(root, silentLogger()).run(false);

        await makeRunner(root, silentLogger()).run(true);
        expect(process.exitCode).toBe(0);
    });
});
