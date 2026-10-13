import { BuilderComponent, RegisterCommand } from '@seedcord/core';

import { Emojis } from '#src/emojis/EmojiInjector';

import type { ResolvedEmoji } from '@seedcord/core';

// justified: the generated EmojiMap is empty in tests
const emojis = Emojis as { Wave: ResolvedEmoji };

@RegisterCommand('global')
export class Wave extends BuilderComponent<'command'> {
    constructor() {
        super('command');
        this.instance.setName('wave').setDescription(emojis.Wave.name);
    }
}
