import { readFile } from 'node:fs/promises';

import { emojisOf } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { errorReason } from '@seedcord/utils/internal';
import { Routes } from 'discord-api-types/v10';

import { applicationOf } from '#core/discord/applicationOf';

import type { DiscordRest } from '#core/discord/runnerDeps';
import type { UploadedEmoji, UploadedFile } from './EmojiDiff';
import type { EmojiFile } from '@seedcord/utils/internal';
import type { RESTGetCurrentApplicationResult, RESTPostAPIApplicationEmojiResult } from 'discord-api-types/v10';

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
        const [what, fix] =
            guildId === undefined
                ? ["the application's emojis"]
                : [`the emojis of guild ${guildId}`, 'Check that the bot is in that guild.'];
        try {
            const listed = await emojisOf(this.rest, this.app.id, guildId);
            return listed.flatMap(({ id, name }) => (id && name ? [{ id, name }] : []));
        } catch (error: unknown) {
            throw new SeedcordError(SeedcordErrorCode.CoreDiscordReadFailed, [what, errorReason(error), fix], {
                cause: error
            });
        }
    }

    public async upload({ name, file, mime }: EmojiFile): Promise<UploadedEmoji> {
        const image = `data:${mime};base64,${await readFile(file, 'base64')}`;
        // justified: discord's documented reply to creating an emoji
        const { id } = (await this.rest.post(Routes.applicationEmojis(this.app.id), {
            body: { name, image }
        })) as RESTPostAPIApplicationEmojiResult;
        return { id, name };
    }

    // the old one is renamed first because names are unique and discord can't swap an image
    public async replace({ file, emoji }: UploadedFile): Promise<void> {
        const parked = `sc_${emoji.id}`;
        await this.rename(emoji, parked);
        const putBack = (): Promise<void> => this.rename(emoji, emoji.name);

        const uploaded = await this.undoing(parked, putBack, () => this.upload(file));
        await this.undoing(
            parked,
            async () => {
                await this.delete(uploaded);
                await putBack();
            },
            () => this.delete(emoji)
        );
    }

    public async delete({ id }: UploadedEmoji): Promise<void> {
        await this.rest.delete(Routes.applicationEmoji(this.app.id, id));
    }

    // .webp with these params works for static and animated ones. .gif 415s on a static emoji
    public imageUrl({ id }: UploadedEmoji): string {
        return `${this.rest.cdn.emoji(id, { extension: 'webp' })}?animated=true&quality=lossless`;
    }

    // runs `undo` if `step` throws, then rethrows. if `undo` throws too, the error gives the old emoji's new name
    private async undoing<Result>(
        parked: string,
        undo: () => Promise<void>,
        step: () => Promise<Result>
    ): Promise<Result> {
        try {
            return await step();
        } catch (error: unknown) {
            try {
                await undo();
            } catch (undoError: unknown) {
                throw new SeedcordError(SeedcordErrorCode.CliEmojiRollbackFailed, [errorReason(error), parked], {
                    cause: undoError
                });
            }
            throw error;
        }
    }

    private async rename({ id }: UploadedEmoji, name: string): Promise<void> {
        await this.rest.patch(Routes.applicationEmoji(this.app.id, id), { body: { name } });
    }
}
