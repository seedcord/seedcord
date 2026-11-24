import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { HostPlugins } from '@seedcord/types/internal';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { HmrManager } from '#hmr/HmrManager';
import { MemberValues } from '#src/dispatch/DispatchContext';
import { Plugin } from '#src/plugin/Plugin';
import { HostHmr } from '#src/plugin/PluginHost';
import { TestServerHost } from '#tests/utils/TestServerHost';

import type { CliChannel } from '#hmr/devChannel';
import type { CoreBase } from '#interfaces/CoreBase';
import type { DispatchContext } from '#src/dispatch/DispatchContext';
import type { DispatchOrigin } from '#src/dispatch/DispatchOrigin';

type WebCtor = new (host: CoreBase, greeting: string) => Plugin;

const PLUGIN_BASE = pathToFileURL(join(import.meta.dirname, '../../src/plugin/Plugin.ts')).href;
const CALLS_SLOT = '__seedcordPluginReloadCalls';

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

    init() {
        ${init}
        globalThis.${CALLS_SLOT}.push('init ${version}');
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

interface FakeCli {
    channel: CliChannel;
    sent: [event: string, payload: unknown][];
    sends: (event: string, payload: unknown) => void;
    saves: (file: string, botImports?: string[]) => void;
}

function fakeCli(): FakeCli {
    const listeners = new Map<string, (payload: unknown) => void>();
    const sent: FakeCli['sent'] = [];
    const channel = {
        send: (event: string, payload: unknown) => void sent.push([event, payload]),
        on: (event: string, listener: (payload: unknown) => void) => void listeners.set(event, listener),
        off: vi.fn()
    };
    const sends: FakeCli['sends'] = (event, payload) => listeners.get(event)?.(payload);
    return {
        // justified: this fake has send, on and off like a CliChannel. only their types are looser
        channel: channel as unknown as CliChannel,
        sent,
        sends,
        saves: (file, botImports) =>
            sends('seedcord:hmr', { file, type: 'update', affectedModules: [file], ...(botImports && { botImports }) })
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
            botImports = [file],
            attachBefore = (_host: TestServerHost): void => undefined,
            attachAfter = (_host: TestServerHost): void => undefined
        } = {}
    ): Promise<TestServerHost> {
        // justified: webPlugin() above writes a Plugin subclass called Web that takes a greeting
        const { Web } = (await import(pathToFileURL(file).href)) as { Web: WebCtor };
        const host = new TestServerHost();
        host[HostHmr] = HmrManager.listenTo(cli.channel);
        attachBefore(host);
        host.attach(key, Web, 'hello');
        attachAfter(host);
        await host.run();
        cli.sends('seedcord:bot-imports', { files: botImports });
        return host;
    }

    const restartsAsked = (cli: FakeCli): unknown[] =>
        cli.sent.filter(([event]) => event === 'seedcord:restart-required').map(([, payload]) => payload);

    beforeEach(() => {
        // macOS tmpdir is a symlink into /private, and vitest imports the same file as two modules under the two paths
        dir = realpathSync(mkdtempSync(join(tmpdir(), 'plugin-reload-')));
        calls = [];
        Reflect.set(globalThis, CALLS_SLOT, calls);
    });

    afterEach(() => {
        TestServerHost.resetHost();
        Reflect.deleteProperty(globalThis, CALLS_SLOT);
        rmSync(dir, { recursive: true, force: true });
    });

    it('asks the CLI which files the bot file imports once every plugin has started', async () => {
        const cli = fakeCli();

        await using _host = await startedBot(write('Web.ts', webPlugin('before')), cli);

        expect(cli.sent).toContainEqual(['seedcord:read-bot-imports', {}]);
    });

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

    it('passes later saves to the new instance and disposes only that one at shutdown', async () => {
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

    it("asks for a restart when the saved file doesn't export an attached plugin", async () => {
        const cli = fakeCli();
        const settings = write('settings.ts', "export const greeting = 'hello';\n");
        await using _host = await startedBot(write('Web.ts', webPlugin('before')), cli, {
            botImports: [join(dir, 'Web.ts'), settings]
        });

        cli.saves(settings, [settings]);

        await vi.waitFor(() => expect(restartsAsked(cli)).toEqual([{ file: settings }]));
        expect(calls).toEqual([...STARTED, 'save reached before']);
    });

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

    it("asks for a restart when the new instance's init() throws", async () => {
        const cli = fakeCli();
        const file = write('Web.ts', webPlugin('before'));
        await using _host = await startedBot(file, cli);

        write('Web.ts', webPlugin('after', "throw new Error('database is down');"));
        cli.saves(file, [file]);

        await vi.waitFor(() => expect(restartsAsked(cli)).toEqual([{ file }]));
        expect(calls).toEqual([...STARTED, 'dispose before']);
    });
});
