import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { readBotToken } from '@seedcord/core/internal';
import { isSeedcordError, SeedcordErrorCode } from '@seedcord/errors';
import { posixRelative } from '@seedcord/utils/internal';
import { bindings, exports } from 'cf/config';
import { Envapter } from 'envapt';
import { assert, beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';

import { CodegenRunner } from '#commands/codegen/CodegenRunner';
import { DevRunner } from '#commands/dev/DevRunner';
import { EdgeDevRuntime } from '#commands/dev/runtime/EdgeDevRuntime';
import { quietSteps } from '#core/output/quietSteps';
import { deployedCommandsFile } from '#core/state/deployedCommands';
import { DevLock } from '#core/state/DevLock';
import { StateFolder } from '#core/state/StateFolder';
import { ShellMode } from '#core/viteMode';
import { READ_IN_WORKERD, writeCloudflareConfig } from '#tests/commands/build/edgeBot';
import { ED25519_KEY_BYTES, FAKE_TOKEN } from '#tests/commands/build/smoke';
import { GREETING, GREETING_PROBE, greetingPlugin } from '#tests/greetingPlugin';
import { loadedConfig } from '#tests/loadedConfig';
import { lockDir } from '#tests/lockDir';
import { silentLogger } from '#tests/silentLogger';
import { vitePluginsOf } from '#tests/vitePluginsOf';
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
import type { ResolvedEdgeTarget, ResolvedSeedcordConfig } from '#core/config/schema';

// node lists a ProcessWrap for each child process until it closes
function runningChildren(): number {
    return process.getActiveResourcesInfo().filter((resource) => resource === 'ProcessWrap').length;
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

    it("reads the bot's token from .dev.vars in the CLI until the runtime stops", async () => {
        const before = Envapter.get('DISCORD_BOT_TOKEN');
        await using project = await edgeProject();

        {
            await using _started = await startedRuntime(project.projectDir);
            expect(readBotToken().value).toBe(FAKE_TOKEN);
        }

        expect(Envapter.get('DISCORD_BOT_TOKEN')).toBe(before);
    }, 120_000);

    describe('on one started bot', () => {
        const events: DevEvent[] = [];
        const pluginObjects: { servers: number }[] = [];
        let projectDir = '';
        let runtime: EdgeDevRuntime | undefined;
        let port = 0;

        beforeAll(async () => {
            await using cleanup = new AsyncDisposableStack();
            ({ projectDir } = cleanup.use(await edgeProject()));
            await appendFile(
                join(projectDir, 'src/bot.ts'),
                "\nimport { DurableObject } from 'cloudflare:workers';\nexport class Counter extends DurableObject {}\n\nexport function helper(): number {\n    return 1;\n}\n"
            );
            await writeCloudflareConfig(projectDir, {
                env: { COUNTER: bindings.durableObject({ worker: 'edge-bot', exportName: 'Counter' }) },
                exports: { Counter: exports.durableObject({ storage: 'sqlite' }) }
            });
            // the worker loads this folder on start
            await writeFile(join(projectDir, 'src/handlers/greeting.ts'), GREETING_PROBE);
            const vitePlugins = vitePluginsOf(() => {
                const counter = { servers: 0 };
                pluginObjects.push(counter);
                return [greetingPlugin(), { name: 'counts-servers', configureServer: () => void counter.servers++ }];
            });
            const started = cleanup.use(
                await startedRuntime(projectDir, (event) => events.push(event), { vitePlugins })
            );
            await started.runtime.startBot(started.instance);
            ({ runtime } = started);
            port = started.port();
            const owned = cleanup.move();
            return () => owned.disposeAsync();
        }, 120_000);

        it('reports each slow startup step before the endpoint listens', () => {
            const types = events.map((event) => event.type);
            const steps = events.flatMap((event) => (event.type === 'progress' ? [event.status] : []));

            expect(types.lastIndexOf('progress')).toBeLessThan(types.indexOf('server-listening'));
            expect(steps).toContainEqual(
                expect.stringContaining(posixRelative(process.cwd(), join(projectDir, 'src/bot.ts')))
            );
        });

        it('starts a bot.ts that exports a function and a durable object class', async () => {
            const unsigned = await fetch(`http://localhost:${port}/`, { method: 'POST', body: '{}' });

            expect(unsigned.status).toBe(401);
        });

        it("runs vitePlugins on the worker's code and on codegen's node copy", async () => {
            assert(runtime);
            const nodeCopy = await runtime.importModule<{ default: string }>(
                join(projectDir, 'src/handlers/greeting.ts')
            );

            expect(nodeCopy.default).toBe(GREETING);
        });

        it('gives the node copy and the worker their own plugin objects from vitePlugins', () => {
            expect(pluginObjects).toEqual([{ servers: 1 }, { servers: 1 }]);
        });
    });

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
        const config: ResolvedSeedcordConfig = {
            ...edgeConfig(projectDir),
            tunnel: { mode: 'off' },
            idleAnimation: false
        };
        const store = new DevStore();
        const state = new StateFolder(projectDir, silentLogger);
        using locks = lockDir();
        const runner = new DevRunner({
            projectLoader: { readConfig: () => Promise.resolve(loadedConfig(config)) },
            store,
            state,
            lock: new DevLock(locks.path, silentLogger),
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

    it('reads text, css and binary files from a listed folder inside workerd', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        const binary = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff]);
        await writeFile(join(projectDir, 'src/locales/dot.png'), binary);
        await writeFile(join(projectDir, 'src/locales/theme.css'), 'body { color: red; }\n');
        await appendFile(join(projectDir, 'src/bot.ts'), READ_IN_WORKERD);

        const caught: unknown = await startedRuntime(projectDir, undefined, {
            files: [join(projectDir, 'src/locales')]
        }).catch((error: unknown) => error);

        const message = Error.isError(caught) ? caught.message : '';
        expect(message).toContain(`dot.png=${binary.toString('hex')}`);
        expect(message).toContain(`theme.css=${Buffer.from('body { color: red; }\n').toString('hex')}`);
    }, 60_000);

    it('reads a listed folder beside root inside workerd', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        await mkdir(join(projectDir, 'shared'));
        await writeFile(join(projectDir, 'shared/hello.txt'), 'hello\n');
        await appendFile(join(projectDir, 'src/bot.ts'), READ_IN_WORKERD.replace('./locales', '../shared'));

        const caught: unknown = await startedRuntime(projectDir, undefined, {
            files: [join(projectDir, 'shared')]
        }).catch((error: unknown) => error);

        const message = Error.isError(caught) ? caught.message : '';
        expect(message).toBe(`read hello.txt=${Buffer.from('hello\n').toString('hex')}`);
    }, 60_000);

    it('stops workerd when the bot throws while workerd loads it', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        await appendFile(
            join(projectDir, 'src/bot.ts'),
            "\nif (navigator.userAgent === 'Cloudflare-Workers') throw new Error('bot.ts threw in workerd');\n"
        );
        const before = runningChildren();

        await expect(startedRuntime(projectDir)).rejects.toThrow('bot.ts threw in workerd');

        await vi.waitFor(() => expect(runningChildren()).toBe(before), { timeout: 10_000 });
    }, 60_000);

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

    it('throws CoreVitePluginThrew for a plugin that throws while edge dev starts', async () => {
        await using project = await edgeProject();
        const vitePlugins = vitePluginsOf(
            () => [
                {
                    name: 'breaks-on-start',
                    configResolved: () => {
                        throw new Error('bad option');
                    }
                }
            ],
            join(project.projectDir, 'seedcord.config.ts')
        );

        const caught: unknown = await startedRuntime(project.projectDir, undefined, { vitePlugins }).catch(
            (error: unknown) => error
        );

        assert(isSeedcordError(caught, 'SeedcordError', SeedcordErrorCode.CoreVitePluginThrew));
        expect(caught.message).toContain('breaks-on-start');
    }, 60_000);

    it('throws CoreVitePluginThrew with the file it was loading when a handler import fails in the worker', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        await writeFile(join(projectDir, 'src/word.ts'), "export const word = 'ok';\n");
        await writeFile(join(projectDir, 'src/handlers/Word.ts'), "export { word } from '../word';\n");
        const vitePlugins = vitePluginsOf(
            () => [
                {
                    name: 'breaks-in-transform',
                    transform: (_code: string, id: string) => {
                        if (id.endsWith('/word.ts')) throw new Error('bad yaml on line 3');
                        return undefined;
                    }
                }
            ],
            join(projectDir, 'seedcord.config.ts')
        );
        await using started = await startedRuntime(projectDir, undefined, { vitePlugins });

        // the worker's error crosses the dev channel as a plain Error that keeps its code
        await expect(started.runtime.startBot(started.instance)).rejects.toMatchObject({
            code: SeedcordErrorCode.CoreVitePluginThrew,
            message: expect.stringMatching(/breaks-in-transform[\s\S]*word\.ts/) as string
        });
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
});
