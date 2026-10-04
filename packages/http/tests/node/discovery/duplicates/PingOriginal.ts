import { SlashRoute } from '@seedcord/core';

import { SlashHandler } from '#handlers/interaction/SlashHandler';

import '#tests/node/discovery/fixtures/registry';

@SlashRoute('ping')
export class PingOriginal extends SlashHandler<'ping'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
