import { SlashRoute } from '@seedcord/core';

import { SlashHandler } from '@handlers/interaction/SlashHandler';

import '../../registry';

@SlashRoute('config/set')
export class ConfigSet extends SlashHandler<'config/set'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
