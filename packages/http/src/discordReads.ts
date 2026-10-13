import { StartupPhase } from '@seedcord/core';
import { COMMAND_DEPLOY_TIMEOUT_MS } from '@seedcord/core/internal';

import { EmojiInjector } from '#src/emojis/EmojiInjector';
import { publicKeyOf } from '#src/publicKey';

import type { Core } from '#interfaces/Core';
import type { InteractionsService } from '#src/InteractionsService';
import type { CommandRegistry } from '@seedcord/core/internal';

interface StartupParts {
    readonly host: Core;
    readonly service: InteractionsService;
    readonly commands: CommandRegistry | undefined;
}

// a deployed edge worker reads the key and ids seedcord build baked
export function addDiscordReads({ host, service, commands }: StartupParts): void {
    const { startup } = host;
    const emojis = new EmojiInjector(host);
    const emojisLoaded = Promise.withResolvers<boolean>();

    startup.addTask(StartupPhase.Login, 'interactions-engine', async () => {
        service.prepareEngine(await publicKeyOf(service.rest));
    });

    startup.addTask(StartupPhase.Login, 'emoji-injection', async (signal) => {
        signal.addEventListener('abort', () => emojisLoaded.resolve(false), { once: true });
        try {
            await emojis.init();
        } catch (error) {
            emojisLoaded.resolve(false);
            throw error;
        }
        emojisLoaded.resolve(true);
    });

    if (!commands) return;
    // one task because tasks in a phase run concurrently and the deploy reads the id
    startup.addTask(
        StartupPhase.Login,
        'command-deploy',
        async (signal) => {
            // emoji-injection reports why it failed
            if (!(await emojisLoaded.promise)) return;
            await commands.deploy(signal, { routes: service.interactions });
        },
        COMMAND_DEPLOY_TIMEOUT_MS
    );
}
