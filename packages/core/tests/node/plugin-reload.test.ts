import { mkdtempDisposableSync, realpathSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

import { HostPlugins } from '@seedcord/types/internal';
import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vite-plus/test';

import { setDevChannel } from '#hmr/devChannel';
import { LEARN_TASK_TIMEOUT_MS } from '#hmr/HmrManager';
import { MemberValues } from '#src/dispatch/DispatchContext';
import { Plugin } from '#src/plugin/Plugin';
import { fakeCliChannel } from '#tests/utils/fakeCliChannel';
import { TestServerHost } from '#tests/utils/TestServerHost';

import type { CoreBase } from '#interfaces/CoreBase';
import type { DispatchContext } from '#src/dispatch/DispatchContext';
import type { DispatchOrigin } from '#src/dispatch/DispatchOrigin';
import type { FakeCliChannel } from '#tests/utils/fakeCliChannel';
import type { BotImport } from '@seedcord/types/internal';

type WebCtor = new (host: CoreBase, greeting: string) => Plugin;

const PLUGIN_BASE = pathToFileURL(join(import.meta.dirname, '../../src/plugin/Plugin.ts')).href;
const CALLS_SLOT = '__seedcordPluginReloadCalls';
const INIT_GATE_SLOT = '__seedcordPluginReloadInitGate';
const SHUTDOWN_WAIT_MS = 100;

// each version logs what seedcord calls on it, and keeps the argument that attach() passed
function webPlugin(version: string, init = ''): string {
    return `import { Plugin } from '${PLUGIN_BASE}';

export class Web extends Plugin {
    version = '${version}';
    dispatchMembers = { webVersion: () => '${version}' };

    constructor(host, greeting) {
        super(host);
        this.greeting = greeting;
    }

    async init() {
        ${init}
        this.started = '${version}';
        globalThis.${CALLS_SLOT}.push('init ${version}');
    }

    fetch() {
        return new Response(this.started ?? 'not started');
    }

    ready() {
        globalThis.${CALLS_SLOT}.push('ready ${version}');
    }

    dispose() {
        globalThis.${CALLS_SLOT}.push('dispose ${version}');
    }

    onHmr() {
        globalThis.${CALLS_SLOT}.push('save reached ${version}');
    }
}
`;
}

const STARTED = ['init before', 'ready before'];
// the new instance's onHmr also gets the update that created it
const REPLACED = [...STARTED, 'dispose before', 'init after', 'ready after', 'save reached after'];

interface FakeCli extends FakeCliChannel {
    saves: (file: string, botImports?: string[]) => void;
}

function fakeCli(): FakeCli {
    const cli = fakeCliChannel();
    return {
        ...cli,
        saves: (file, botImports) =>
            cli.sends('seedcord:hmr', {
                file,
                type: 'update',
                affectedModules: [file],
                ...(botImports && { botImports })
            })
    };
}

describe('reloading a plugin under seedcord dev', () => {
    let dir: string;
    let calls: string[];

    function write(name: string, source: string): string {
        const file = join(dir, name);
        writeFileSync(file, source);
        return file;
    }

    // the transport's Seedcord class does this part in a real bot
    async function startedBot(
        file: string,
        cli: FakeCli,
        {
            key = 'web',
            imports = [{ file, names: ['Web'] }],
            attachBefore = (_host: TestServerHost): void => undefined,
            attachAfter = (_host: TestServerHost): void => undefined
        }: {
            key?: string;
            imports?: BotImport[];
            attachBefore?: (host: TestServerHost) => void;
            attachAfter?: (host: TestServerHost) => void;
        } = {}
    ): Promise<TestServerHost> {
        // justified: webPlugin() above writes a Plugin subclass called Web that takes a greeting
        const { Web } = (await import(pathToFileURL(file).href)) as { Web: WebCtor };
        setDevChannel(cli.channel);
        onTestFinished(() => setDevChannel(undefined));
        const host = new TestServerHost();
        attachBefore(host);
        host.attach(key, Web, 'hello');
        attachAfter(host);
        // startup waits for this answer, the way the real CLI gives it
        const send = cli.channel.send.bind(cli.channel);
        cli.channel.send = (event, payload) => {
            send(event, payload);
            if (event === 'seedcord:read-bot-imports') cli.sends('seedcord:bot-imports', { imports });
        };
        await host.run();
        return host;
    }

    const restartsAsked = (cli: FakeCli): unknown[] =>
        cli.sent.filter(([event]) => event === 'seedcord:restart-required').map(([, payload]) => payload);

    beforeEach(() => {
        const folder = mkdtempDisposableSync(join(tmpdir(), 'plugin-reload-'));
        // macOS tmpdir is a symlink into /private, and vitest imports the same file as two modules under the two paths
        dir = realpathSync(folder.path);
        calls = [];
        Reflect.set(globalThis, CALLS_SLOT, calls);
        return () => {
            TestServerHost.resetHost();
            Reflect.deleteProperty(globalThis, CALLS_SLOT);
            Reflect.deleteProperty(globalThis, INIT_GATE_SLOT);
            folder.remove();
        };
    });

    it('asks the CLI which files the bot file imports once every plugin has started', async () => {
        const cli = fakeCli();

        cli.channel.send = (event) => void calls.push(`sent ${event}`);

        await using _host = await startedBot(write('Web.ts', webPlugin('before')), cli);

        expect(calls).toEqual([...STARTED, 'sent seedcord:read-bot-imports']);
    });

    it(
        'finishes starting when the CLI never answers which files the bot file imports',
        async () => {
            // the startup task's time limit is only the learn() wait because this plugin doesn't define ready()
            class Quiet extends Plugin {
                public init(): void {}
            }
            setDevChannel(fakeCli().channel);
            onTestFinished(() => setDevChannel(undefined));

            // waits out LEARN_WAIT_MS for real. fake timers stall startup's other timers
            await using _host = await new TestServerHost().attach('quiet', Quiet).run();
        },
        2 * LEARN_TASK_TIMEOUT_MS
    );

    it.each([
        ['web', (host: TestServerHost) => Reflect.get(host, 'web') as unknown],
        [
            'services.web',
            (host: TestServerHost) => Reflect.get(Reflect.get(host, 'services') as object, 'web') as unknown
        ]
    ])('replaces the plugin at %s with the class that its saved file exports now', async (key, attached) => {
        const cli = fakeCli();
        const file = write('Web.ts', webPlugin('before'));
        await using host = await startedBot(file, cli, { key });

        write('Web.ts', webPlugin('after'));
        cli.saves(file, [file]);

        await vi.waitFor(() => expect(calls).toEqual(REPLACED));
        expect(attached(host)).toMatchObject({ version: 'after', greeting: 'hello' });
        expect(restartsAsked(cli)).toEqual([]);
    });

    it('builds dispatch members from the new instance', async () => {
        const cli = fakeCli();
        const file = write('Web.ts', webPlugin('before'));
        await using host = await startedBot(file, cli);

        write('Web.ts', webPlugin('after'));
        cli.saves(file, [file]);
        await vi.waitFor(() => expect(calls).toEqual(REPLACED));

        // justified: buildMembers only writes MemberValues on the context and passes the origin through
        const dispatch = {} as DispatchContext;
        await host[HostPlugins].buildMembers(dispatch, {} as DispatchOrigin);
        expect(dispatch[MemberValues]).toEqual({ webVersion: 'after' });
    });

    it('sends later updates to the new instance and disposes only that one at shutdown', async () => {
        const cli = fakeCli();
        const file = write('Web.ts', webPlugin('before'));
        {
            await using _host = await startedBot(file, cli);
            write('Web.ts', webPlugin('after'));
            cli.saves(file, [file]);
            await vi.waitFor(() => expect(calls).toEqual(REPLACED));

            cli.saves(join(dir, 'handler.ts'));
            await vi.waitFor(() => expect(calls).toEqual([...REPLACED, 'save reached after']));
        }

        expect(calls).toEqual([...REPLACED, 'save reached after', 'dispose after']);
    });

    // resolves after the old instance's dispose(). the new one's init() then waits on the returned gate
    async function savedWithInitWaiting(file: string, cli: FakeCli): Promise<PromiseWithResolvers<undefined>> {
        const initGate = Promise.withResolvers<undefined>();
        Reflect.set(globalThis, INIT_GATE_SLOT, initGate.promise);
        write('Web.ts', webPlugin('after', `await globalThis.${INIT_GATE_SLOT};`));
        cli.saves(file, [file]);
        await vi.waitFor(() => expect(calls).toContain('dispose before'));
        return initGate;
    }

    it('holds a request that arrives during a reload until the new instance has started', async () => {
        const cli = fakeCli();
        const file = write('Web.ts', webPlugin('before'));
        await using host = await startedBot(file, cli);

        const initGate = await savedWithInitWaiting(file, cli);
        const answered = host.fetch(new Request('http://localhost/'));
        initGate.resolve(undefined);
        const response = await answered;

        expect(await response.text()).toBe('after');
    });

    it('disposes a plugin that a reload is still starting when the bot shuts down', async () => {
        const cli = fakeCli();
        const file = write('Web.ts', webPlugin('before'));
        await using host = await startedBot(file, cli);

        const initGate = await savedWithInitWaiting(file, cli);
        const stopped = host[Symbol.asyncDispose]();
        // without the wait, shutdown ends first and init() finishes after it
        void Promise.race([stopped, setTimeout(SHUTDOWN_WAIT_MS)]).then(() => initGate.resolve(undefined));
        await stopped;

        expect(calls).toEqual([...REPLACED, 'dispose after']);
    });

    it('keeps a replaced plugin at its place in the attach order', async () => {
        class Neighbor extends Plugin {
            public constructor(
                host: CoreBase,
                private readonly label: string
            ) {
                super(host);
            }

            public init(): void {}

            public override dispose(): void {
                calls.push(`dispose ${this.label}`);
            }
        }
        const cli = fakeCli();
        const file = write('Web.ts', webPlugin('before'));
        {
            await using host = await startedBot(file, cli, {
                attachBefore: (bot) => void bot.attach('first', Neighbor, 'first'),
                attachAfter: (bot) => void bot.attach('last', Neighbor, 'last')
            });
            write('Web.ts', webPlugin('after'));
            cli.saves(file, [file]);
            await vi.waitFor(() => expect(calls).toEqual(REPLACED));

            expect(host[HostPlugins].keys).toEqual(['first', 'web', 'last']);
        }

        // shutdown disposes in the reverse of the attach order
        expect(calls.slice(REPLACED.length)).toEqual(['dispose last', 'dispose after', 'dispose first']);
    });

    it('replaces the current instance when the bot file imports the plugin directly and through a barrel', async () => {
        const cli = fakeCli();
        const file = write('Web.ts', webPlugin('before'));
        const barrel = write('plugins.ts', "export { Web } from './Web';\n");
        await using host = await startedBot(file, cli, {
            imports: [
                { file, names: ['Web'] },
                { file: barrel, names: ['Web'] }
            ]
        });

        cli.saves(barrel, [barrel]);
        await vi.waitFor(() => expect(calls).toContain('dispose before'));
        write('Web.ts', webPlugin('after'));
        cli.saves(file, [file, barrel]);

        await vi.waitFor(() => expect(Reflect.get(host, 'web')).toMatchObject({ version: 'after' }));
        expect(host[HostPlugins].attachments.map(({ instance }) => instance)).toEqual([Reflect.get(host, 'web')]);
        expect(restartsAsked(cli)).toEqual([]);
    });

    it('still reloads a plugin when another file the bot file imports throws', async () => {
        const cli = fakeCli();
        const file = write('Web.ts', webPlugin('before'));
        const broken = write('broken.ts', "throw new Error('typo');\n");
        await using host = await startedBot(file, cli, {
            imports: [
                { file: broken, names: ['greeting'] },
                { file, names: ['Web'] }
            ]
        });

        write('Web.ts', webPlugin('after'));
        cli.saves(file, [file]);

        await vi.waitFor(() => expect(Reflect.get(host, 'web')).toMatchObject({ version: 'after' }));
        expect(restartsAsked(cli)).toEqual([]);
    });

    it("asks for a restart when the saved file doesn't export an attached plugin", async () => {
        const cli = fakeCli();
        const settings = write('settings.ts', "export const greeting = 'hello';\n");
        await using _host = await startedBot(write('Web.ts', webPlugin('before')), cli, {
            imports: [
                { file: join(dir, 'Web.ts'), names: ['Web'] },
                { file: settings, names: ['greeting'] }
            ]
        });

        cli.saves(settings, [settings]);

        await vi.waitFor(() => expect(restartsAsked(cli)).toEqual([{ file: settings }]));
        expect(calls).toEqual(STARTED);
    });

    const READS: [string, BotImport['names']][] = [
        ['by name', ['Web', 'PORT']],
        ['through a namespace import', 'all']
    ];

    it.each(READS)(
        'asks for a restart when the bot file also reads a value from the saved plugin file %s',
        async (_how, names) => {
            const cli = fakeCli();
            const file = write('Web.ts', `${webPlugin('before')}\nexport const PORT = 3000;\n`);
            await using _host = await startedBot(file, cli, { imports: [{ file, names }] });

            write('Web.ts', `${webPlugin('after')}\nexport const PORT = 4000;\n`);
            cli.saves(file, [file]);

            await vi.waitFor(() => expect(restartsAsked(cli)).toEqual([{ file }]));
            expect(calls).toEqual(STARTED);
        }
    );

    it('keeps the old instance running when the saved file throws while it imports', async () => {
        const cli = fakeCli();
        const file = write('Web.ts', webPlugin('before'));
        await using host = await startedBot(file, cli);

        write('Web.ts', "throw new Error('typo');\n");
        cli.saves(file, [file]);
        await vi.waitFor(() => expect(calls).toEqual([...STARTED, 'save reached before']));
        expect(Reflect.get(host, 'web')).toMatchObject({ version: 'before' });

        write('Web.ts', webPlugin('after'));
        cli.saves(file, [file]);
        await vi.waitFor(() => expect(Reflect.get(host, 'web')).toMatchObject({ version: 'after' }));
        expect(restartsAsked(cli)).toEqual([]);
    });

    it("keeps the old instance running when the saved class's constructor throws", async () => {
        const cli = fakeCli();
        const file = write('Web.ts', webPlugin('before'));
        await using host = await startedBot(file, cli);

        write('Web.ts', webPlugin('after').replace('super(host);', "super(host);\n        throw new Error('typo');"));
        cli.saves(file, [file]);
        await vi.waitFor(() => expect(calls).toEqual([...STARTED, 'save reached before']));

        expect(Reflect.get(host, 'web')).toMatchObject({ version: 'before' });
        expect(restartsAsked(cli)).toEqual([]);
    });

    it("still reloads the file's other plugins when one constructor throws", async () => {
        // seedcord rebuilds Broken before Web because Broken comes first in the file
        const withBroken = (version: string): string =>
            webPlugin(version).replace(
                'export class Web',
                `export class Broken extends Plugin {
    constructor(host) {
        super(host);
        ${version === 'after' ? "throw new Error('typo');" : ''}
    }

    init() {}
}

export class Web`
            );
        const cli = fakeCli();
        const file = write('Web.ts', withBroken('before'));
        // justified: withBroken() writes a Plugin subclass called Broken that takes only the host
        const { Broken } = (await import(pathToFileURL(file).href)) as { Broken: new (host: CoreBase) => Plugin };
        await using host = await startedBot(file, cli, {
            imports: [{ file, names: ['Broken', 'Web'] }],
            attachBefore: (bot) => void bot.attach('broken', Broken)
        });

        write('Web.ts', withBroken('after'));
        cli.saves(file, [file]);

        await vi.waitFor(() => expect(Reflect.get(host, 'web')).toMatchObject({ version: 'after' }));
        expect(restartsAsked(cli)).toEqual([]);
    });

    it('keeps the old instance and its members when the saved class claims a member another plugin has', async () => {
        class Other extends Plugin {
            public override readonly dispatchMembers = { otherThing: (): string => 'other' };
            public init(): void {}
        }
        const cli = fakeCli();
        const file = write('Web.ts', webPlugin('before'));
        await using host = await startedBot(file, cli, { attachAfter: (bot) => void bot.attach('other', Other) });

        write('Web.ts', webPlugin('after').replace("webVersion: () => 'after'", "otherThing: () => 'after'"));
        cli.saves(file, [file]);
        await vi.waitFor(() => expect(calls).toEqual([...STARTED, 'save reached before']));

        expect(Reflect.get(host, 'web')).toMatchObject({ version: 'before' });
        expect(restartsAsked(cli)).toEqual([]);
        expect(host[HostPlugins].members).toEqual([
            { key: 'web', member: 'webVersion' },
            { key: 'other', member: 'otherThing' }
        ]);
    });

    it("asks for a restart when the new instance's init() throws, and again on each later save", async () => {
        const cli = fakeCli();
        const file = write('Web.ts', webPlugin('before'));
        await using _host = await startedBot(file, cli);

        write('Web.ts', webPlugin('after', "throw new Error('database is down');"));
        cli.saves(file, [file]);
        await vi.waitFor(() => expect(restartsAsked(cli)).toEqual([{ file }]));

        write('Web.ts', webPlugin('fixed'));
        cli.saves(file, [file]);
        await vi.waitFor(() => expect(restartsAsked(cli)).toEqual([{ file }, { file }]));
        expect(calls).toEqual([...STARTED, 'dispose before']);
        expect(cli.sent.map(([event]) => event)).not.toContain('seedcord:hmr-applied');
    });
});
