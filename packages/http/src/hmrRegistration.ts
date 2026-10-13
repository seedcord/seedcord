import { StartupPhase } from '@seedcord/core';
import { attachmentsOf } from '@seedcord/core/internal';

import type { Core } from '#interfaces/Core';
import type { InteractionsService } from '#src/InteractionsService';
import type { CommandRegistry, HmrManager } from '@seedcord/core/internal';

interface HmrParts {
    readonly host: Core & Parameters<typeof attachmentsOf>[0];
    readonly service: InteractionsService;
    readonly commands: CommandRegistry | undefined;
}

// a Configuration task because plugins attach after the constructor runs
export function addHmrRegistration(hmr: HmrManager, { host, service, commands }: HmrParts): void {
    host.startup.addTask(StartupPhase.Configuration, 'hmr-registration', () => {
        if (service.interactions) hmr.register(service.interactions);
        if (commands) hmr.register(commands);
        hmr.register(service.subscribers);
        for (const { instance } of attachmentsOf(host)) hmr.register(instance);
        return Promise.resolve();
    });
}
