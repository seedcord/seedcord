import { Readable } from 'node:stream';

import { TextDisplayBuilder } from '@discordjs/builders';
import { describe, expect, it, vi } from 'vitest';

import { ReplySender } from '@reply/ReplySender';

import type { RawFile, REST } from '@discordjs/rest';
import type { InteractionRef } from '@reply/ReplySender';
import type { ReplyResponse } from '@seedcord/types';

const BYTES = new Uint8Array([0x73, 0x65, 0x65, 0x64]);
const ref: InteractionRef = { application_id: '111', id: '222', token: 'tok' };
const components = [new TextDisplayBuilder().setContent('hi')];

interface RestMock {
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
}

function restMock(): RestMock {
    return {
        post: vi.fn().mockResolvedValue({ resource: { message: { id: 'msg-1' } } }),
        patch: vi.fn().mockResolvedValue({ id: 'msg-1' })
    };
}

// justified: the fixture implements only the REST surface ReplySender reads
function senderFor(rest: RestMock): ReplySender {
    return new ReplySender(ref, rest as unknown as REST, 'slash:ban');
}

function sentFiles(rest: RestMock): RawFile[] | undefined {
    return (rest.post.mock.calls[0]?.[1] as { files?: RawFile[] }).files;
}

function sentAttachments(rest: RestMock): unknown[] | undefined {
    return (rest.post.mock.calls[0]?.[1] as { body: { data?: { attachments?: unknown[] } } }).body.data?.attachments;
}

async function replyWith(files: NonNullable<ReplyResponse['files']>): Promise<RestMock> {
    const rest = restMock();
    await senderFor(rest).reply({ components, files });
    return rest;
}

describe('the portable file', () => {
    it('reaches @discordjs/rest as its own bytes under its own name', async () => {
        expect(sentFiles(await replyWith([{ data: BYTES, name: 'seed.txt' }]))).toEqual([
            { name: 'seed.txt', data: BYTES }
        ]);
    });

    it('sends alt text on the attachments entry, which RawFile has no field for', async () => {
        const rest = await replyWith([{ data: BYTES, name: 'seed.txt', description: 'four bytes' }]);

        expect(sentAttachments(rest)).toEqual([{ id: 0, filename: 'seed.txt', description: 'four bytes' }]);
    });

    it('sends no attachments entry when no file carries alt text', async () => {
        expect(sentAttachments(await replyWith([{ data: BYTES, name: 'seed.txt' }]))).toBeUndefined();
    });

    it('accepts a Buffer, which extends Uint8Array', async () => {
        const buffer = Buffer.from(BYTES);

        expect(sentFiles(await replyWith([{ data: buffer, name: 'seed.txt' }]))).toEqual([
            { name: 'seed.txt', data: buffer }
        ]);
    });

    it('keeps each file under the name it was given', async () => {
        const rest = await replyWith([
            { data: BYTES, name: 'first.txt' },
            { data: BYTES, name: 'second.txt' }
        ]);

        expect(sentFiles(rest)?.map((file) => file.name)).toEqual(['first.txt', 'second.txt']);
    });
});

describe('what the types reject', () => {
    it('rejects every form @discordjs/rest cannot upload', () => {
        const rejected: ReplyResponse[] = [
            // @ts-expect-error nothing on this transport reads a path off disk
            { components, files: ['./logo.png'] },
            // @ts-expect-error the discord.js attachment payload is gateway-only
            { components, files: [{ attachment: Buffer.from('x'), name: 'a.txt' }] },
            // @ts-expect-error a node stream is gateway-only
            { components, files: [Readable.from([Buffer.from('x')])] },
            // @ts-expect-error name is required because an unnamed file cannot be referenced by a v2 component
            { components, files: [{ data: BYTES }] }
        ];

        expect(rejected).toHaveLength(4);
    });
});

describe('the other verbs', () => {
    it('sends the bytes on followUp', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.reply({ components });

        await sender.followUp({ components, files: [{ data: BYTES, name: 'seed.txt' }] });

        expect((rest.post.mock.calls[1]?.[1] as { files?: RawFile[] }).files).toEqual([
            { name: 'seed.txt', data: BYTES }
        ]);
    });

    it('sends the bytes on edit', async () => {
        const rest = restMock();
        const sender = senderFor(rest);
        await sender.defer();

        await sender.edit({ components, files: [{ data: BYTES, name: 'seed.txt' }] });

        expect((rest.patch.mock.calls[0]?.[1] as { files?: RawFile[] }).files).toEqual([
            { name: 'seed.txt', data: BYTES }
        ]);
    });
});
