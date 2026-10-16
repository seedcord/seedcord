import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { SeedcordErrorCode } from '@seedcord/errors';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { CodegenRunner } from '#commands/codegen/CodegenRunner';
import { DevRunner } from '#commands/dev/DevRunner';
import { EdgeDevRuntime } from '#commands/dev/runtime/EdgeDevRuntime';
import { quietSteps } from '#core/output/quietSteps';
import { deployedCommandsFile } from '#core/state/deployedCommands';
import { StateFolder } from '#core/state/StateFolder';
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
import type { EdgeTarget } from '#core/config/detectTarget';
import type { ProjectLoader } from '#core/config/ProjectLoader';
import type { ResolvedSeedcordConfig } from '#core/config/schema';

describe('EdgeDevRuntime lifecycle', () => {
    it("gives codegen's node copy the secrets from .dev.vars", async () => {
        await using project = await edgeProject({ ...liveVars, API_TOKEN: ' from-dev-vars ' });
        const { projectDir } = project;
        await editFile(join(projectDir, 'src/bot.ts'), (text) =>
            text.replace(
                "import type { CoreBase } from '@seedcord/http';",
                "import type { CoreBase } from '@seedcord/http';\n\nReflect.set(globalThis, 'apiToken', env.API_TOKEN.trim());"
            )
        );
        onTestFinished(() => {
            Reflect.deleteProperty(globalThis, 'apiToken');
        });

        await using _started = await startedRuntime(projectDir);

        expect(Reflect.get(globalThis, 'apiToken')).toBe('from-dev-vars');
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
        expect(steps).toContainEqual(expect.stringContaining(relative(process.cwd(), join(projectDir, 'src/bot.ts'))));
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
            codegen: CodegenRunner.create(quietSteps, silentLogger),
            codegenLogger: silentLogger,
            // justified: tunnel mode off routes nothing
            tunnel: { route: () => undefined, stop: () => Promise.resolve() } as unknown as TunnelRouter,
            // justified: edgeConfig sets an edge target
            runtime: (target) => new EdgeDevRuntime(target as EdgeTarget)
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

    it('exports the durable object classes bot.ts exports', async () => {
        await using project = await edgeProject();
        const { projectDir } = project;
        await appendFile(
            join(projectDir, 'src/bot.ts'),
            "\nimport { DurableObject } from 'cloudflare:workers';\nexport class Counter extends DurableObject {}\n"
        );
        await editFile(join(projectDir, 'wrangler.jsonc'), (text) =>
            text.replace(
                '"compatibility_date"',
                '"durable_objects": { "bindings": [{ "name": "COUNTER", "class_name": "Counter" }] },\n    "migrations": [{ "tag": "v1", "new_sqlite_classes": ["Counter"] }],\n    "compatibility_date"'
            )
        );
        await using started = await startedRuntime(projectDir);
        const { runtime, instance } = started;
        await runtime.startBot(instance);

        const unsigned = await fetch(`http://localhost:${started.port()}/`, { method: 'POST', body: '{}' });
        expect(unsigned.status).toBe(401);
    }, 120_000);
});
