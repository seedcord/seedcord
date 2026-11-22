import { readFile } from 'node:fs/promises';

import { emojisAt } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { errorReason } from '@seedcord/utils/internal';
import { Routes } from 'discord-api-types/v10';

import { applicationOf } from '#core/discord/applicationOf';

import type { DiscordRest } from '#core/discord/runnerDeps';
import type { UploadedEmoji, UploadedFile } from './emojiDiff';
import type { EmojiFile } from '@seedcord/utils/internal';
import type { RESTGetCurrentApplicationResult } from 'discord-api-types/v10';

type Application = Pick<RESTGetCurrentApplicationResult, 'id' | 'name'>;

export class EmojiSession {
    private constructor(
        private readonly rest: DiscordRest,
        public readonly app: Application
    ) {}

    public static async open(rest: DiscordRest): Promise<EmojiSession> {
        const { id, name } = await applicationOf(rest);
        return new EmojiSession(rest, { id, name });
    }

    public async list(guildId?: string): Promise<UploadedEmoji[]> {
        const [route, what, fix] =
            guildId === undefined
                ? [Routes.applicationEmojis(this.app.id), "the application's emojis"]
                : [
                      Routes.guildEmojis(guildId),
                      `the emojis of guild ${guildId}`,
                      'Check that the bot is in that guild.'
                  ];
        try {
            const listed = await emojisAt(this.rest, route);
            return listed.flatMap(({ id, name }) => (id && name ? [{ id, name }] : []));
        } catch (error: unknown) {
            throw new SeedcordError(SeedcordErrorCode.CoreDiscordReadFailed, [what, errorReason(error), fix], {
                cause: error
            });
        }
    }

    public async upload({ name, file, mime }: EmojiFile): Promise<void> {
        const image = `data:${mime};base64,${await readFile(file, 'base64')}`;
        await this.rest.post(Routes.applicationEmojis(this.app.id), { body: { name, image } });
    }

    // discord can't swap an emoji's image and names have to be unique. that's why the old one gets renamed first
    public async replace({ file, emoji }: UploadedFile): Promise<void> {
        await this.rename(emoji, `sc_${emoji.id}`);
        try {
            await this.upload(file);
        } catch (error: unknown) {
            await this.rename(emoji, emoji.name);
            throw error;
        }
        await this.delete(emoji);
    }

    public async delete({ id }: UploadedEmoji): Promise<void> {
        await this.rest.delete(Routes.applicationEmoji(this.app.id, id));
    }

    // .webp with these params works for static and animated ones. .gif 415s on a static emoji
    public imageUrl({ id }: UploadedEmoji): string {
        return `${this.rest.cdn.emoji(id, { extension: 'webp' })}?animated=true&quality=lossless`;
    }

    private async rename({ id }: UploadedEmoji, name: string): Promise<void> {
        await this.rest.patch(Routes.applicationEmoji(this.app.id, id), { body: { name } });
    }
}
