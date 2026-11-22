import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { DiscordAPIError } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

import { APP_ID, fakeProject } from '#tests/commands/commands/fakeBot';

import type { FakeProject } from '#tests/commands/commands/fakeBot';
import type { REST } from '@discordjs/rest';
import type { RESTJSONErrorCodes } from 'discord-api-types/v10';

const APP_NAME = 'seed beta';

interface StoredEmoji {
    id: string;
    name: string;
    image: string;
}

interface EmojiDiscordOptions {
    // the application starts with an emoji for each name
    emojis?: readonly string[];
    // uploading or deleting one of these names rejects with its error
    rejects?: Record<string, Error>;
    // what guild 111 has
    guildEmojis?: readonly string[];
}

export const GUILD_ID = '111';

interface FakeEmojiDiscord {
    rest: REST;
    emojis: () => readonly StoredEmoji[];
    requests: string[];
}

const BAD_REQUEST = 400;

export function discordError(code: RESTJSONErrorCodes, message: string): DiscordAPIError {
    return new DiscordAPIError({ code, message }, code, BAD_REQUEST, 'POST', Routes.applicationEmojis(APP_ID), {});
}

// a fake bot whose emojis folder has these files
export async function projectWith(files: Record<string, string | Uint8Array>, edge = false): Promise<FakeProject> {
    const project = await fakeProject({ edge });
    for (const [path, content] of Object.entries(files)) {
        const file = join(project.dir, 'emojis', path);
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, content);
    }
    return project;
}

export function fakeEmojiDiscord({
    emojis = [],
    rejects = {},
    guildEmojis = []
}: EmojiDiscordOptions = {}): FakeEmojiDiscord {
    const stored = new Map<string, StoredEmoji>(
        emojis.map((name) => [`${name}-id`, { id: `${name}-id`, name, image: 'old' }])
    );
    const requests: string[] = [];
    let created = 0;
    const idIn = (route: string): string => route.slice(Routes.applicationEmojis(APP_ID).length + 1);
    const assertFree = (name: string): void => {
        if ([...stored.values()].some((emoji) => emoji.name === name)) throw new Error(`${name} is taken`);
    };

    const rest = {
        get: (route: string) => {
            requests.push(`GET ${route}`);
            if (route === Routes.currentApplication()) return Promise.resolve({ id: APP_ID, name: APP_NAME });
            if (route === Routes.guildEmojis(GUILD_ID)) {
                return Promise.resolve(guildEmojis.map((name) => ({ id: `${name}-guild-id`, name })));
            }
            return Promise.resolve({ items: [...stored.values()].map(({ id, name }) => ({ id, name })) });
        },
        post: (_route: string, { body }: { body: { name: string; image: string } }) => {
            requests.push(`POST ${body.name}`);
            const rejection = rejects[body.name];
            if (rejection) return Promise.reject(rejection);
            assertFree(body.name);
            const emoji = { id: `new-${++created}`, ...body };
            stored.set(emoji.id, emoji);
            return Promise.resolve({ id: emoji.id, name: emoji.name });
        },
        patch: (route: string, { body }: { body: { name: string } }) => {
            const emoji = stored.get(idIn(route));
            if (!emoji) return Promise.reject(new Error('Unknown Emoji'));
            requests.push(`PATCH ${emoji.name} to ${body.name}`);
            assertFree(body.name);
            emoji.name = body.name;
            return Promise.resolve({ id: emoji.id, name: emoji.name });
        },
        delete: (route: string) => {
            const id = idIn(route);
            const name = stored.get(id)?.name ?? id;
            requests.push(`DELETE ${name}`);
            const rejection = rejects[name];
            if (rejection) return Promise.reject(rejection);
            stored.delete(id);
            return Promise.resolve();
        },
        cdn: { emoji: (id: string) => `https://cdn.test/emojis/${id}.webp` }
    };
    // eslint-disable-next-line no-restricted-syntax -- the emoji runners call only these five members on this double
    return { rest: rest as unknown as REST, emojis: () => [...stored.values()], requests };
}
