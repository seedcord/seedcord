import { SlashRoute } from '@seedcord/core';

import { SlashHandler } from '#handlers/interaction/SlashHandler';

import '../fixtures/registry';

@SlashRoute('ping')
export class PingOriginal extends SlashHandler<'ping'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
