import { ResolvedEmoji } from '@seedcord/core';
import { accessorStore, clearStore, guardedAccessor, resolveEmojis } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';

import type { Core } from '#interfaces/Core';
import type { BakedIds } from '@seedcord/core/internal';
import type { EmojiMap } from '@seedcord/types';

const emojiStorage = accessorStore<ResolvedEmoji>();

/** The global {@link Emojis} accessor type. */
export type InjectedEmojiMap = {
    [K in keyof EmojiMap]: ResolvedEmoji;
};

/**
 * The bot's resolved emojis, keyed by {@link EmojiMap}. A node bot fills these during startup. An edge
 * bot fills them on its first request, from the ids `seedcord build` wrote into the worker.
 *
 * @throws A **SeedcordError** when you read a key that was not filled.
 */
export const Emojis = guardedAccessor('Emojis', emojiStorage) as InjectedEmojiMap;

export function installEmojis(emojis: BakedIds['emojis']): void {
    clearStore(emojiStorage);
    for (const [key, { name, id, animated }] of Object.entries(emojis)) {
        emojiStorage[key] = new ResolvedEmoji(name, id, animated);
    }
}

// resolves the configured emojis over REST at startup
export class EmojiInjector {
    private readonly logger = new Logger('Emojis', { channel: 'bot' });

    constructor(private readonly core: Core) {}

    public async init(): Promise<void> {
        const configured = this.core.config.bot.emojis;
        if (!configured || Object.keys(configured).length === 0) {
            installEmojis({});
            this.logger.debug('No emojis configured, skipping emoji injection.');
            return;
        }

        installEmojis(await resolveEmojis(this.core.rest, this.core.applicationId, configured));
        this.logger.utils.summary('Loaded emojis', { emojis: Object.keys(emojiStorage).length });
    }
}
