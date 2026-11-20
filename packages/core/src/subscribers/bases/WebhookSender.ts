import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { discordErrorOf } from '@seedcord/utils/internal';
import { Routes } from 'discord-api-types/v10';

import type { REST } from '@discordjs/rest';
import type { ReplyFile } from '@seedcord/types';
import type { APIMessageTopLevelComponent } from 'discord-api-types/v10';

const HTTP_NOT_FOUND = 404;
const HTTP_UNAUTHORIZED = 401;

/** A file attached to a webhook report. */
export interface WebhookFile extends ReplyFile {
    readonly description: string;
}

export interface WebhookSendOptions {
    flags: number;
    username: string;
    avatarUrl?: string | undefined;
    components: readonly APIMessageTopLevelComponent[];
    files?: readonly WebhookFile[] | undefined;
}

export class WebhookSender {
    private readonly route: `/${string}`;

    constructor(
        private readonly rest: REST,
        url: string
    ) {
        const match = /\/webhooks\/(\d+)\/([\w$-]+)$/.exec(url);
        if (!match?.[1] || !match[2]) {
            throw new SeedcordTypeError(SeedcordErrorCode.CoreWebhookUrlInvalid, [new.target.name]);
        }
        this.route = Routes.webhook(match[1], match[2]);
    }

    // missing means discord answered 404 or 401
    async verify(): Promise<'ok' | 'missing' | 'unreachable'> {
        try {
            await this.rest.get(this.route, { auth: false });
            return 'ok';
        } catch (error) {
            const status = discordErrorOf(error)?.status;
            const gone = status === HTTP_NOT_FOUND || status === HTTP_UNAUTHORIZED;
            return gone ? 'missing' : 'unreachable';
        }
    }

    async send(options: WebhookSendOptions): Promise<void> {
        const { flags, username, avatarUrl, components, files } = options;
        await this.rest.post(this.route, {
            auth: false,
            // with_components=true makes discord accept a components-v2 payload. wait=true makes it
            // return payload errors in the response
            query: new URLSearchParams({ with_components: 'true', wait: 'true' }),
            body: {
                flags,
                username,
                ...(avatarUrl && { avatar_url: avatarUrl }),
                components,
                ...(files?.length && {
                    attachments: files.map((file, id) => ({ id, filename: file.name, description: file.description }))
                })
            },
            ...(files?.length && { files: files.map((file) => ({ name: file.name, data: file.data })) })
        });
    }
}
