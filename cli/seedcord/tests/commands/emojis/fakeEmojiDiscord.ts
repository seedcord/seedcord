import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { DiscordAPIError } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

import { APP_ID } from '#tests/commands/commands/fakeBot';

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
    // an upload under one of these names rejects with its error
    rejects?: Record<string, Error>;
}

interface FakeEmojiDiscord {
    rest: REST;
    emojis: () => readonly StoredEmoji[];
    requests: string[];
}

const BAD_REQUEST = 400;

export function discordError(code: RESTJSONErrorCodes, message: string): DiscordAPIError {
    return new DiscordAPIError({ code, message }, code, BAD_REQUEST, 'POST', Routes.applicationEmojis(APP_ID), {});
}

export async function writeEmojis(projectDir: string, files: Record<string, string | Uint8Array>): Promise<void> {
    for (const [path, content] of Object.entries(files)) {
        const file = join(projectDir, 'emojis', path);
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, content);
    }
}

export function fakeEmojiDiscord({ emojis = [], rejects = {} }: EmojiDiscordOptions = {}): FakeEmojiDiscord {
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
            requests.push(`DELETE ${stored.get(id)?.name ?? id}`);
            stored.delete(id);
            return Promise.resolve();
        }
    };
    // eslint-disable-next-line no-restricted-syntax -- the emoji runners call only get, post, patch and delete on this double
    return { rest: rest as unknown as REST, emojis: () => [...stored.values()], requests };
}
