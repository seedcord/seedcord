import { execFileSync } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { posixRelative } from '@seedcord/utils/node/internal';
import { bindings, exports } from 'cf/config';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { CodegenRunner } from '#commands/codegen/CodegenRunner';
import { DevRunner } from '#commands/dev/DevRunner';
import { EdgeDevRuntime } from '#commands/dev/runtime/EdgeDevRuntime';
import { quietSteps } from '#core/output/quietSteps';
import { deployedCommandsFile } from '#core/state/deployedCommands';
import { StateFolder } from '#core/state/StateFolder';
import { ShellMode } from '#core/viteMode';
import { writeCloudflareConfig } from '#tests/commands/build/edgeBot';
import { ED25519_KEY_BYTES } from '#tests/commands/build/smoke';
import { silentLogger } from '#tests/silentLogger';
import { DevStore } from '#ui/stores/DevStore';

import {
    captureLogs,
    edgeConfig,
    edgeProject,
    editFile,
    fakeDiscordApi,
    liveVars,
    messagesOf,
    startedRuntime,
    WAVE_COMMAND
} from './edgeDevRuntime';

import type { DevEvent } from '#commands/dev/runtime/events';
import type { TunnelRouter } from '#commands/dev/tunnel/TunnelRouter';
import type { ProjectLoader } from '#core/config/ProjectLoader';
import type { ResolvedEdgeTarget, ResolvedSeedcordConfig } from '#core/config/schema';

function workerdChildren(): string[] {
    try {
        return execFileSync('pgrep', ['-P', String(process.pid), 'workerd'])
            .toString()
            .trim()
            .split('\n');
    } catch (error) {
        // pgrep exits 1 when nothing matches
        if (Error.isError(error) && 'status' in error && error.status === 1) return [];
        throw error;
    }
}

async function nodeCopyApiToken(projectDir: string, viteMode = 'development'): Promise<unknown> {
    await writeCloudflareConfig(projectDir, { env: { API_TOKEN: bindings.secret() } });
    await editFile(join(projectDir, 'src/bot.ts'), (text) =>
        text.replace(
            "import type { CoreBase } from '@seedcord/http';",
            "import type { CoreBase } from '@seedcord/http';\n\nReflect.set(globalThis, 'apiToken', env.API_TOKEN);"
        )
    );
    onTestFinished(() => {
        Reflect.deleteProperty(globalThis, 'apiToken');
    });

    await using _started = await startedRuntime(projectDir, undefined, { viteMode });
    return Reflect.get(globalThis, 'apiToken');
}

describe('EdgeDevRuntime lifecycle', () => {
    it("gives codegen's node copy the values from .dev.vars", async () => {
        await using project = await edgeProject({ ...liveVars, API_TOKEN: 'from-dev-vars' });
        await writeFile(join(project.projectDir, '.env'), 'API_TOKEN=from-dot-env\n');

        await expect(nodeCopyApiToken(project.projectDir)).resolves.toBe('from-dev-vars');
    }, 120_000);

    it('reads the .dev.vars file for the vite mode', async () => {
        await using project = await edgeProject();
        const staging = Object.entries({ ...liveVars, API_TOKEN: 'from-staging' }).map(
            ([key, value]) => `${key}=${value}`
        );
        await writeFile(join(project.projectDir, '.dev.vars.staging'), `${staging.join('\n')}\n`);

        await expect(nodeCopyApiToken(project.projectDir, 'staging')).resolves.toBe('from-staging');
    }, 120_000);

    it('reports each slow startup step before the endpoint listens', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        const events: DevEvent[] = [];

        await using started = await startedRuntime(projectDir, (event) => events.push(event));
        const { runtime, instance } = started;
        await runtime.startBot(instance);

        const types = events.map((event) => event.type);
        const steps = events.flatMap((event) => (event.type === 'progress' ? [event.status] : []));
        expect(types.lastIndexOf('progress')).toBeLessThan(types.indexOf('server-listening'));
        expect(steps).toContainEqual(
            expect.stringContaining(posixRelative(process.cwd(), join(projectDir, 'src/bot.ts')))
        );
    }, 120_000);

    it('runs the startup sequence once in a seedcord dev session', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        const discord = await fakeDiscordApi();
        await editFile(join(projectDir, 'src/bot.ts'), (text) =>
            text
                .replace(
                    'bot: { interactions:',
                    `bot: { restOptions: { api: '${discord.api}' }, commands: { path: './commands' }, interactions:`
                )
                .replace(', commands: { path: null }', '')
        );
        await mkdir(join(projectDir, 'src/commands'));
        await writeFile(join(projectDir, 'src/commands/Wave.ts'), WAVE_COMMAND);
        const logs = captureLogs();
        // justified: the runner reads only these fields on top of the runtime's
        const config = {
            ...edgeConfig(projectDir),
            tunnel: { mode: 'off' },
            typecheck: { enabled: false },
            idleAnimation: false
        } as ResolvedSeedcordConfig;
        const store = new DevStore();
        const state = new StateFolder(projectDir, silentLogger);
        const runner = new DevRunner({
            // justified: the runner reads config and disposes the project
            projectLoader: {
                open: () => Promise.resolve({ config, [Symbol.asyncDispose]: () => Promise.resolve() })
            } as unknown as Pick<ProjectLoader, 'open'>,
            store,
            state,
            codegen: CodegenRunner.create(quietSteps, silentLogger, new ShellMode()),
            codegenLogger: silentLogger,
            // justified: tunnel mode off routes nothing
            tunnel: { route: () => undefined, stop: () => Promise.resolve() } as unknown as TunnelRouter,
            // justified: edgeConfig sets an edge target
            runtime: (target) => new EdgeDevRuntime(target as ResolvedEdgeTarget)
        });
        const running = runner.run();
        await using _quit = {
            [Symbol.asyncDispose]: async () => {
                await runner.quit();
                await running;
            }
        };

        await vi.waitFor(() => expect(store.getState().phase).toBe('running'), { timeout: 60_000 });

        expect(messagesOf(logs).filter((message) => message === 'Starting coordinated startup sequence')).toHaveLength(
            1
        );
        await vi.waitFor(() => expect(state.read(deployedCommandsFile)?.scopes).toBeDefined());
    }, 120_000);

    it('rejects with the error the worker failed to start with', async () => {
        await using project = await edgeProject({ DISCORD_PUBLIC_KEY: 'ab'.repeat(ED25519_KEY_BYTES) });
        const { projectDir } = project;
        await using started = await startedRuntime(projectDir);
        const { runtime, instance } = started;

        await expect(runtime.startBot(instance)).rejects.toHaveProperty('code', SeedcordErrorCode.ConfigMissingEnv);
    }, 120_000);

    it('rejects start when the bot throws while workerd loads it', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        // node's codegen copy loads bot.ts too
        await appendFile(
            join(projectDir, 'src/bot.ts'),
            "\nif (navigator.userAgent === 'Cloudflare-Workers') throw new Error('bot.ts threw in workerd');\n"
        );

        await expect(startedRuntime(projectDir)).rejects.toThrow('bot.ts threw in workerd');
    }, 60_000);

    // windows has no pgrep. there, rm in the test above throws EBUSY if workerd still runs
    it.skipIf(process.platform === 'win32')(
        'stops workerd when the bot throws while workerd loads it',
        async () => {
            await using project = await edgeProject();
            const { projectDir } = project;
            await appendFile(
                join(projectDir, 'src/bot.ts'),
                "\nif (navigator.userAgent === 'Cloudflare-Workers') throw new Error('bot.ts threw in workerd');\n"
            );

            await expect(startedRuntime(projectDir)).rejects.toThrow('bot.ts threw in workerd');

            await vi.waitFor(() => expect(workerdChildren()).toEqual([]), { timeout: 10_000 });
        },
        60_000
    );

    it('settles a start that is still running when the session stops', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        await using started = await startedRuntime(projectDir);
        const { runtime, instance } = started;

        const starting = runtime.startBot(instance);
        await runtime.stop();

        await expect(starting).resolves.toBeUndefined();
    }, 120_000);

    it('starts a fresh worker for the next session after a stop', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        await using first = await startedRuntime(projectDir);
        await first.runtime.startBot(first.instance);
        await first.runtime.stop();

        await using second = await startedRuntime(projectDir);
        await second.runtime.startBot(second.instance);

        const unsigned = await fetch(`http://localhost:${second.port()}/`, { method: 'POST', body: '{}' });
        expect(unsigned.status).toBe(401);
    }, 120_000);

    it('starts a bot.ts that has a named export', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        await appendFile(join(projectDir, 'src/bot.ts'), '\nexport function helper(): number {\n    return 1;\n}\n');
        await using started = await startedRuntime(projectDir);
        const { runtime, instance } = started;
        await runtime.startBot(instance);

        const unsigned = await fetch(`http://localhost:${started.port()}/`, { method: 'POST', body: '{}' });
        expect(unsigned.status).toBe(401);
    }, 60_000);

    it('throws CliStartFailed when the worker answers a GET with something other than 405', async () => {
        await using project = await edgeProject();
        await writeFile(
            join(project.projectDir, 'src/bot.ts'),
            "export default { fetch: () => new Response('not a seedcord bot') };\n"
        );

        await expect(startedRuntime(project.projectDir)).rejects.toMatchObject({
            code: SeedcordErrorCode.CliStartFailed,
            message: expect.stringContaining('answered a GET with 200') as string
        });
    }, 60_000);

    // cloudflare/workers-sdk#16324
    it('starts a session that swaps a named export for a durable object', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        const bot = join(projectDir, 'src/bot.ts');
        const original = await readFile(bot, 'utf8');
        await writeFile(bot, `${original}\nexport function helper(): number {\n    return 1;\n}\n`);
        await using first = await startedRuntime(projectDir);
        await first.runtime.startBot(first.instance);
        await first.runtime.stop();

        await writeFile(
            bot,
            `${original}\nimport { DurableObject } from 'cloudflare:workers';\nexport class Counter extends DurableObject {}\n`
        );
        await writeCloudflareConfig(projectDir, {
            env: { COUNTER: bindings.durableObject({ worker: 'edge-bot', exportName: 'Counter' }) },
            exports: { Counter: exports.durableObject({ storage: 'sqlite' }) }
        });
        await using second = await startedRuntime(projectDir);
        await second.runtime.startBot(second.instance);

        const unsigned = await fetch(`http://localhost:${second.port()}/`, { method: 'POST', body: '{}' });
        expect(unsigned.status).toBe(401);
    }, 120_000);

    it('exports the durable object classes bot.ts exports', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        await appendFile(
            join(projectDir, 'src/bot.ts'),
            "\nimport { DurableObject } from 'cloudflare:workers';\nexport class Counter extends DurableObject {}\n"
        );
        await writeCloudflareConfig(projectDir, {
            env: { COUNTER: bindings.durableObject({ worker: 'edge-bot', exportName: 'Counter' }) },
            exports: { Counter: exports.durableObject({ storage: 'sqlite' }) }
        });
        await using started = await startedRuntime(projectDir);
        const { runtime, instance } = started;
        await runtime.startBot(instance);

        const unsigned = await fetch(`http://localhost:${started.port()}/`, { method: 'POST', body: '{}' });
        expect(unsigned.status).toBe(401);
    }, 120_000);
});
