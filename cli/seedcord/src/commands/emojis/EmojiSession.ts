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

    public async list(): Promise<UploadedEmoji[]> {
        try {
            const listed = await emojisAt(this.rest, Routes.applicationEmojis(this.app.id));
            return listed.flatMap(({ id, name }) => (id && name ? [{ id, name }] : []));
        } catch (error: unknown) {
            throw new SeedcordError(
                SeedcordErrorCode.CoreDiscordReadFailed,
                ["the application's emojis", errorReason(error)],
                { cause: error }
            );
        }
    }

    public async upload({ name, file }: EmojiFile): Promise<void> {
        const bytes = await readFile(file);
        // discord ignores the mime type but won't take the string without the data: prefix
        const image = `data:image/png;base64,${bytes.toString('base64')}`;
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
        await this.rest.delete(Routes.applicationEmoji(this.app.id, emoji.id));
    }

    private async rename({ id }: UploadedEmoji, name: string): Promise<void> {
        await this.rest.patch(Routes.applicationEmoji(this.app.id, id), { body: { name } });
    }
}
