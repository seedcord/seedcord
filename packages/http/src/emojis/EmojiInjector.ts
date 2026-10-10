import { accessorStore, clearStore, guardedAccessor, resolveEmojis } from '@seedcord/core/internal';
import { Logger } from '@seedcord/logger';

import type { Core } from '#interfaces/Core';
import type { ResolvedEmoji } from '@seedcord/core';
import type { EmojiMap } from '@seedcord/types';

const emojiStorage = accessorStore<ResolvedEmoji>();

/** The global {@link Emojis} accessor type. */
export type InjectedEmojiMap = {
    [K in keyof EmojiMap]: ResolvedEmoji;
};

/**
 * The bot's resolved emojis, keyed by {@link EmojiMap}. Filled by {@link EmojiInjector} during startup.
 * Throws if you read a key the injector did not fill.
 */
export const Emojis = guardedAccessor('Emojis', emojiStorage) as InjectedEmojiMap;

// resolves the configured emojis over REST at startup
export class EmojiInjector {
    private readonly logger = new Logger('Emojis', { channel: 'bot' });

    constructor(private readonly core: Core) {}

    public async init(): Promise<void> {
        clearStore(emojiStorage);

        const configured = this.core.config.bot.emojis;
        if (!configured || Object.keys(configured).length === 0) {
            this.logger.debug('No emojis configured, skipping emoji injection.');
            return;
        }

        Object.assign(emojiStorage, await resolveEmojis(this.core.rest, this.core.applicationId, configured));
        this.logger.utils.summary('Loaded emojis', { emojis: Object.keys(emojiStorage).length });
    }
}
