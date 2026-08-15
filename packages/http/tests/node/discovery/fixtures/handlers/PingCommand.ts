import { SlashRoute } from '@seedcord/core';

import { SlashHandler } from '#handlers/interaction/SlashHandler';

import '../registry';

@SlashRoute('ping')
export class PingCommand extends SlashHandler<'ping'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
