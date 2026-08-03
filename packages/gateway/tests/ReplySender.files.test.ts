import { Readable } from 'node:stream';

import { TextDisplayBuilder } from '@discordjs/builders';
import { Attachment, AttachmentBuilder } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { mockInteraction, senderFor } from './utils/senderMock';

import type { GatewayReplyResponse } from '@interfaces/ReplyResponse';
import type { ReplyResponse } from '@seedcord/types';

const BYTES = new Uint8Array([0x73, 0x65, 0x65, 0x64]);
const components = [new TextDisplayBuilder().setContent('hi')];

function sentFiles(mock: ReturnType<typeof mockInteraction>): unknown[] | undefined {
    return (mock.reply.mock.calls[0]?.[0] as { files?: unknown[] }).files;
}

async function replyWith(files: NonNullable<GatewayReplyResponse['files']>): Promise<unknown[] | undefined> {
    const mock = mockInteraction();
    await senderFor(mock).reply({ components, files });
    return sentFiles(mock);
}

describe('the portable file', () => {
    it('reaches discord.js as a Buffer, which is the only byte form it accepts', async () => {
        const files = await replyWith([{ data: BYTES, name: 'seed.txt' }]);

        expect(files).toEqual([{ attachment: Buffer.from(BYTES), name: 'seed.txt' }]);
        expect(Buffer.isBuffer((files as { attachment: unknown }[])[0]?.attachment)).toBe(true);
    });

    it('carries alt text through', async () => {
        const files = await replyWith([{ data: BYTES, name: 'seed.txt', description: 'four bytes' }]);

        expect(files).toEqual([{ attachment: Buffer.from(BYTES), name: 'seed.txt', description: 'four bytes' }]);
    });

    it('omits description when the file sets none', async () => {
        const files = await replyWith([{ data: BYTES, name: 'seed.txt' }]);

        expect(files?.[0]).not.toHaveProperty('description');
    });
});

describe('the attachment metadata', () => {
    it('carries a title through', async () => {
        const files = await replyWith([{ data: BYTES, name: 'note.ogg', title: 'Voice note' }]);

        expect(files).toEqual([{ attachment: Buffer.from(BYTES), name: 'note.ogg', title: 'Voice note' }]);
    });

    it('carries a title and alt text together', async () => {
        const files = await replyWith([{ data: BYTES, name: 'a.png', title: 'T', description: 'D' }]);

        expect(files).toEqual([{ attachment: Buffer.from(BYTES), name: 'a.png', description: 'D', title: 'T' }]);
    });

    it('omits title when the file sets none', async () => {
        const files = await replyWith([{ data: BYTES, name: 'a.png' }]);

        expect(files?.[0]).not.toHaveProperty('title');
    });

    it('sends a SPOILER_ name through', async () => {
        const files = await replyWith([{ data: BYTES, name: 'SPOILER_secret.png' }]);

        expect(files).toEqual([{ attachment: Buffer.from(BYTES), name: 'SPOILER_secret.png' }]);
    });
});

describe('the discord.js file forms', () => {
    it('passes an AttachmentBuilder through untouched', async () => {
        const builder = new AttachmentBuilder(Buffer.from(BYTES), { name: 'seed.txt' });

        expect(await replyWith([builder])).toEqual([builder]);
    });

    it('passes an AttachmentBuilder over a stream through untouched', async () => {
        const builder = new AttachmentBuilder(Readable.from([Buffer.from(BYTES)]), { name: 'seed.txt' });

        expect(await replyWith([builder])).toEqual([builder]);
    });

    it('passes a bare Buffer through untouched', async () => {
        const buffer = Buffer.from(BYTES);

        expect(await replyWith([buffer])).toEqual([buffer]);
    });

    it('passes a path string through, which discord.js reads off disk', async () => {
        expect(await replyWith(['./fixture.txt'])).toEqual(['./fixture.txt']);
    });

    it('passes a bare stream through untouched', async () => {
        const stream = Readable.from([Buffer.from(BYTES)]);

        expect(await replyWith([stream])).toEqual([stream]);
    });

    it('passes an Attachment a message already carries through untouched', async () => {
        const attachment = Reflect.construct(Attachment, [
            { id: '1', filename: 'a.txt', size: 4, url: 'https://cdn.discordapp.com/a.txt', proxy_url: 'x' }
        ]) as never;

        expect(await replyWith([attachment])).toEqual([attachment]);
    });

    it('passes an attachment payload through untouched', async () => {
        const payload = { attachment: Buffer.from(BYTES), name: 'seed.txt' };

        expect(await replyWith([payload])).toEqual([payload]);
    });

    it('converts only the portable entry when the two are mixed', async () => {
        const builder = new AttachmentBuilder(Buffer.from(BYTES), { name: 'b.txt' });

        const files = await replyWith([{ data: BYTES, name: 'a.txt' }, builder]);

        expect(files).toEqual([{ attachment: Buffer.from(BYTES), name: 'a.txt' }, builder]);
    });
});

describe('what the types allow', () => {
    it('accepts a reply a shared notice or page render built, which names the portable type', () => {
        const shared: ReplyResponse = { components, files: [{ data: BYTES, name: 'a.png' }] };
        const bound: GatewayReplyResponse = shared;

        expect(bound.files).toHaveLength(1);
    });

    it('rejects a discord.js file form on the portable type, which a Notice render returns', () => {
        // @ts-expect-error only GatewayReplyResponse accepts the discord.js forms
        const response: ReplyResponse = { components, files: [new AttachmentBuilder(Buffer.from(BYTES))] };

        expect(response.files).toHaveLength(1);
    });

    it('rejects a file with no name', () => {
        // @ts-expect-error name is required because an unnamed file cannot be referenced by a v2 component
        const response: GatewayReplyResponse = { components, files: [{ data: BYTES }] };

        expect(response.files).toHaveLength(1);
    });
});

describe('the other verbs', () => {
    it('converts on edit', async () => {
        const mock = mockInteraction({ deferred: true, ephemeral: false });

        await senderFor(mock).edit({ components, files: [{ data: BYTES, name: 'seed.txt' }] });

        expect((mock.editReply.mock.calls[0]?.[0] as { files?: unknown[] }).files).toEqual([
            { attachment: Buffer.from(BYTES), name: 'seed.txt' }
        ]);
    });

    it('converts on update', async () => {
        const mock = mockInteraction();

        await senderFor(mock).update({ components, files: [{ data: BYTES, name: 'seed.txt' }] });

        expect((mock.update.mock.calls[0]?.[0] as { files?: unknown[] }).files).toEqual([
            { attachment: Buffer.from(BYTES), name: 'seed.txt' }
        ]);
    });

    it('converts on followUp', async () => {
        const mock = mockInteraction({ replied: true });

        await senderFor(mock).followUp({ components, files: [{ data: BYTES, name: 'seed.txt' }] });

        expect((mock.followUp.mock.calls[0]?.[0] as { files?: unknown[] }).files).toEqual([
            { attachment: Buffer.from(BYTES), name: 'seed.txt' }
        ]);
    });
});
