import { execFile } from 'node:child_process';
import { mkdir, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it } from 'vite-plus/test';

import { copyEdgeBotForTest } from './commands/build/edgeBot';
import { tempProject } from './core/config/projectLoaderFixtures';

const run = promisify(execFile);
const PACKAGE_DIR = join(import.meta.dirname, '..');
const BIN = join(PACKAGE_DIR, 'bin', 'seedcord.mjs');

function jsonLine(line: string): unknown {
    try {
        return JSON.parse(line);
    } catch {
        throw new Error(`Not a JSON line: ${line}`);
    }
}

async function codegenIn(projectDir: string): Promise<{ code: number; stderr: string }> {
    return run(process.execPath, [BIN, 'codegen'], { cwd: projectDir }).then(
        (ok) => ({ code: 0, stderr: ok.stderr }),
        (failed: { code: number; stderr: string }) => ({ code: failed.code, stderr: failed.stderr })
    );
}

describe('the seedcord CLI', () => {
    it('refuses to run in a project with no seedcord installed', async () => {
        const { code, stderr } = await codegenIn(tempProject());

        expect(code).toBe(1);
        expect(stderr).toContain(`[${SeedcordErrorCode.CliDependencyMissing}]`);
    });

    it('refuses to run from an install other than the project', async () => {
        const project = tempProject();
        const installed = join(project, 'node_modules', 'seedcord');
        await mkdir(installed, { recursive: true });
        await writeFile(join(installed, 'package.json'), '{}');

        const { code, stderr } = await codegenIn(project);

        expect(code).toBe(1);
        expect(stderr).toContain(`[${SeedcordErrorCode.CliNotProjectInstall}]`);
    });

    it('runs from a symlinked project install and goes on to look for the config', async () => {
        const project = tempProject();
        await symlink(
            PACKAGE_DIR,
            join(project, 'node_modules', 'seedcord'),
            process.platform === 'win32' ? 'junction' : 'dir'
        );

        const { stderr } = await codegenIn(project);

        expect(stderr).toContain(`[${SeedcordErrorCode.CliConfigNotFound}]`);
    });

    it('prints only JSON lines from dev without a terminal, including a vite plugin that calls console', async () => {
        const projectDir = await copyEdgeBotForTest();
        await mkdir(join(projectDir, 'node_modules'));
        await symlink(PACKAGE_DIR, join(projectDir, 'node_modules', 'seedcord'), 'dir');
        await writeFile(
            join(projectDir, 'seedcord.config.ts'),
            `export default {
                root: './src',
                instance: './bot.ts',
                vitePlugins: () => [{
                    name: 'calls-console',
                    configResolved() {
                        console.log('plugin log');
                        console.warn('plugin warn');
                    }
                }]
            };`
        );

        // the missing token stops the run during startup
        const { DISCORD_BOT_TOKEN: _token, ...env } = process.env;
        const { stdout, stderr } = await run(process.execPath, [BIN, 'dev'], {
            cwd: projectDir,
            env: { ...env, CI: 'true' }
        }).catch((failed: { stdout: string; stderr: string }) => failed);

        expect(stderr).toBe('');
        const lines = stdout.trimEnd().split('\n').map(jsonLine);
        expect(lines).toContainEqual(expect.objectContaining({ message: 'plugin log', level: 'info' }));
        expect(lines).toContainEqual(expect.objectContaining({ message: 'plugin warn', level: 'warn' }));
        expect(lines.at(-1)).toMatchObject({
            label: 'Dev',
            message: expect.stringContaining('dev stopped') as unknown
        });
    }, 60_000);
});
