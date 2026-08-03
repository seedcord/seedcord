import { DiscordAPIError, REST } from '@discordjs/rest';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Routes } from 'discord-api-types/v10';

import type { ReplyFile } from '@seedcord/types';
import type { APIMessageTopLevelComponent } from 'discord-api-types/v10';

const HTTP_NOT_FOUND = 404;
const HTTP_UNAUTHORIZED = 401;

/** A file attached to a webhook report. */
export interface WebhookFile extends ReplyFile {
    readonly description: string;
}

/** The payload {@link WebhookSender.send} posts. */
export interface WebhookSendOptions {
    flags: number;
    username: string;
    components: readonly { toJSON(): APIMessageTopLevelComponent }[];
    files?: readonly WebhookFile[] | undefined;
}

/**
 * Sends component messages to a Discord webhook through `@discordjs/rest`.
 *
 * @throws A `SeedcordError` when the url does not carry a webhook id and token.
 */
export class WebhookSender {
    private readonly rest = new REST();
    private readonly route: `/${string}`;

    constructor(url: string) {
        const match = /\/webhooks\/(\d+)\/([\w$-]+)$/.exec(url);
        // the url is a secret, so the error message never carries it
        if (!match?.[1] || !match[2]) throw new SeedcordError(SeedcordErrorCode.ConfigWebhookUrlInvalid, ['The url']);
        this.route = Routes.webhook(match[1], match[2]);
    }

    /**
     * Fetches the webhook object, sending no message. Returns `missing` on a 404 or 401 from
     * Discord and `unreachable` on any other failure.
     */
    async verify(): Promise<'ok' | 'missing' | 'unreachable'> {
        try {
            await this.rest.get(this.route, { auth: false });
            return 'ok';
        } catch (error) {
            const gone =
                error instanceof DiscordAPIError &&
                (error.status === HTTP_NOT_FOUND || error.status === HTTP_UNAUTHORIZED);
            return gone ? 'missing' : 'unreachable';
        }
    }

    async send(options: WebhookSendOptions): Promise<void> {
        const { flags, username, components, files } = options;
        await this.rest.post(this.route, {
            auth: false,
            // with_components=true makes discord accept a components-v2 payload. wait=true makes it
            // return payload errors in the response
            query: new URLSearchParams({ with_components: 'true', wait: 'true' }),
            body: {
                flags,
                username,
                components: components.map((component) => component.toJSON()),
                ...(files?.length && {
                    attachments: files.map((file, id) => ({ id, filename: file.name, description: file.description }))
                })
            },
            ...(files?.length && { files: files.map((file) => ({ name: file.name, data: file.data })) })
        });
    }
}
