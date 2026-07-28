import { ComponentType } from 'discord-api-types/v10';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { WebhookSender } from '@subscribers/bases/WebhookSender';

import type { APIMessageTopLevelComponent } from 'discord-api-types/v10';

const mocks = vi.hoisted(() => ({
    postMock: vi.fn().mockResolvedValue(undefined),
    getMock: vi.fn().mockResolvedValue({})
}));
const { postMock, getMock } = mocks;

vi.mock('@discordjs/rest', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@discordjs/rest')>()),
    REST: class {
        post = mocks.postMock;
        get = mocks.getMock;
    }
}));

beforeEach(() => {
    postMock.mockClear();
    getMock.mockReset().mockResolvedValue({});
});

describe('WebhookSender', () => {
    it('throws on a url without a webhook id and token', () => {
        expect(() => new WebhookSender('https://example.com/not-a-webhook')).toThrow();
    });

    it('posts components and file metadata to the webhook route without auth', async () => {
        const sender = new WebhookSender('https://discord.com/api/webhooks/123/abc-XY');
        await sender.send({
            flags: 32_768,
            username: 'Unknown Exception',
            components: [
                { toJSON: (): APIMessageTopLevelComponent => ({ type: ComponentType.Container, components: [] }) }
            ],
            files: [{ name: 'metadata.json', description: 'error metadata', data: Buffer.from('{}') }]
        });

        expect(postMock).toHaveBeenCalledTimes(1);
        const [route, options] = postMock.mock.calls[0] as [string, Record<string, unknown>];
        expect(route).toBe('/webhooks/123/abc-XY');
        expect(options.auth).toBe(false);
        expect(String(options.query)).toContain('with_components=true');
        expect(options.body).toEqual({
            flags: 32_768,
            username: 'Unknown Exception',
            components: [{ type: ComponentType.Container, components: [] }],
            attachments: [{ id: 0, filename: 'metadata.json', description: 'error metadata' }]
        });
        expect(options.files).toEqual([{ name: 'metadata.json', data: Buffer.from('{}') }]);
    });

    it('omits attachments and files when no files are given', async () => {
        const sender = new WebhookSender('https://discord.com/api/webhooks/123/abc-XY');
        await sender.send({ flags: 32_768, username: 'Handled Exception', components: [] });

        const [, options] = postMock.mock.calls[0] as [string, Record<string, unknown>];
        expect(options.body).toEqual({ flags: 32_768, username: 'Handled Exception', components: [] });
        expect(options.files).toBeUndefined();
    });
});

describe('WebhookSender.verify', () => {
    const sender = (): WebhookSender => new WebhookSender('https://discord.com/api/webhooks/123/abc-XY');

    it('resolves ok when the webhook answers', async () => {
        await expect(sender().verify()).resolves.toBe('ok');
        const [route, options] = getMock.mock.calls[0] as [string, Record<string, unknown>];
        expect(route).toBe('/webhooks/123/abc-XY');
        expect(options.auth).toBe(false);
    });

    it('resolves missing on a 404 from discord', async () => {
        const { DiscordAPIError } = await import('@discordjs/rest');
        getMock.mockRejectedValueOnce(
            new DiscordAPIError({ message: 'Unknown Webhook', code: 10_015 }, 10_015, 404, 'GET', 'url', {})
        );
        await expect(sender().verify()).resolves.toBe('missing');
    });

    it('resolves missing on a 401 from discord', async () => {
        const { DiscordAPIError } = await import('@discordjs/rest');
        getMock.mockRejectedValueOnce(
            new DiscordAPIError({ message: 'Invalid Webhook Token', code: 50_027 }, 50_027, 401, 'GET', 'url', {})
        );
        await expect(sender().verify()).resolves.toBe('missing');
    });

    it('resolves unreachable on a network failure', async () => {
        getMock.mockRejectedValueOnce(new TypeError('fetch failed'));
        await expect(sender().verify()).resolves.toBe('unreachable');
    });
});
