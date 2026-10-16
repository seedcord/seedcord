import { EventEmitter } from 'node:events';
import { mkdir, mkdtempDisposable, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { BuilderComponent, RegisterCommand } from '@seedcord/core';
import { SeedcordBrand } from '@seedcord/types/internal';
import { ApplicationCommandType, Routes } from 'discord-api-types/v10';
import { onTestFinished, vi } from 'vitest';

import { Project } from '#core/project/Project';

import type { ProjectLoader } from '#core/config/ProjectLoader';
import type { ResolvedSeedcordConfig } from '#core/config/schema';
import type { ModuleLoader } from '#core/modules/ModuleLoader';
import type { Terminal } from '#core/output/terminal';
import type { REST } from '@discordjs/rest';

export const APP_ID = 'app-1';

export class Ping extends BuilderComponent<'command'> {
    public constructor() {
        super('command');
        this.instance.setName('ping').setDescription('Replies with pong');
    }
}
RegisterCommand('global')(Ping);

export class Config extends BuilderComponent<'command'> {
    public constructor() {
        super('command');
        this.instance.setName('config').setDescription('Settings');
    }
}
RegisterCommand('guild', ['111'])(Config);

type CommandClass = new () => BuilderComponent<'command'>;

interface BotOptions {
    commands?: CommandClass[];
    commandsPath?: string | null;
    edge?: boolean;
}

export type ProjectOpener = Pick<ProjectLoader, 'open'>;

interface FakeDiscord {
    rest: REST;
    gets: string[];
    puts: { route: string; names: string[] }[];
    deletes: string[];
}

export function slash(name: string): { id: string; name: string; type: ApplicationCommandType } {
    return { id: `${name}-id`, name, type: ApplicationCommandType.ChatInput };
}

export async function fakeProject({
    commands = [Ping, Config],
    commandsPath = './commands',
    edge = false
}: BotOptions = {}): Promise<ProjectOpener> {
    const dir = await mkdtempDisposable(join(tmpdir(), 'bot-'));
    onTestFinished(() => dir.remove());
    const root = dir.path;
    await mkdir(join(root, 'commands'));
    const byPath = new Map<string, Record<string, unknown>>();
    for (const Command of commands) {
        const file = join(root, 'commands', `${Command.name}.ts`);
        await writeFile(file, '');
        byPath.set(file, { [Command.name]: Command });
    }

    const instance = resolve(root, 'bot.ts');
    byPath.set(instance, {
        default: { [SeedcordBrand]: true, config: { bot: { commands: { path: commandsPath, guilds: [] } } } }
    });

    // justified: the commands runners read only these paths off the config
    const config = {
        root,
        instance,
        configFile: resolve(root, 'seedcord.config.ts'),
        target: edge
            ? { kind: 'edge', wranglerConfig: resolve(root, 'wrangler.jsonc') }
            : { kind: 'server', entry: resolve(root, 'index.ts') },
        build: { outDir: resolve(root, 'dist') }
    } as ResolvedSeedcordConfig;
    // justified: the commands runners read only importModule off the loader
    const modules = {
        importModule: (path: string) => Promise.resolve(byPath.get(path) ?? {}),
        [Symbol.asyncDispose]: () => Promise.resolve()
    } as ModuleLoader & AsyncDisposable;
    return { open: () => Promise.resolve(new Project(config, modules)) };
}

// an Error as a route's answer makes every request to that route reject with it.
// a function answers a GET from its query
function answersFromQuery(answer: unknown): answer is (query: URLSearchParams | undefined) => unknown {
    return typeof answer === 'function';
}

function reply(answer: unknown): Promise<unknown> {
    return Error.isError(answer) ? Promise.reject(answer) : Promise.resolve(answer);
}

export function fakeDiscord(onDiscord: Record<string, unknown> = {}): FakeDiscord {
    const gets: string[] = [];
    const puts: FakeDiscord['puts'] = [];
    const deletes: string[] = [];
    const answers: Record<string, unknown> = {
        [Routes.currentApplication()]: { id: APP_ID },
        [Routes.applicationCommands(APP_ID)]: [],
        [Routes.guild('111')]: { id: '111', name: 'Alpha' },
        [Routes.applicationGuildCommands(APP_ID, '111')]: [],
        [Routes.userGuilds()]: [],
        ...onDiscord
    };
    const rest = Object.assign(new EventEmitter(), {
        get: vi.fn((route: string, options?: { query?: URLSearchParams }) => {
            gets.push(route);
            const answer = answers[route];
            return reply(answersFromQuery(answer) ? answer(options?.query) : answer);
        }),
        put: vi.fn(async (route: string, { body }: { body: { name: string }[] }) => {
            await reply(answers[route]);
            puts.push({ route, names: body.map((command) => command.name) });
            return [];
        }),
        delete: vi.fn(async (route: string) => {
            await reply(answers[route]);
            deletes.push(route);
        })
    });
    // eslint-disable-next-line no-restricted-syntax -- the runners call only get, put, delete, on and off on this double
    return { rest: rest as unknown as REST, gets, puts, deletes };
}

// the bot's guild list, paged the way discord pages it after the id in the query
export function botGuilds(count: number): Record<string, unknown> {
    const guilds = Array.from({ length: count }, (_, i) => ({ id: `g${i}`, name: `G${i}` }));
    const page = (query: URLSearchParams): unknown[] => {
        const after = guilds.findIndex(({ id }) => id === query.get('after'));
        return guilds.slice(after + 1, after + 1 + Number(query.get('limit')));
    };
    return { [Routes.userGuilds()]: page };
}

// a piped terminal, read back without colors and with plain spaces
export function pipedTerminal(): Terminal & { text: () => string } {
    let written = '';
    return {
        isTTY: false,
        columns: 0,
        write: (chunk: string | Uint8Array) => {
            written += String(chunk);
            return true;
        },
        text: () => stripVTControlCharacters(written).replaceAll(' ', ' ')
    };
}
