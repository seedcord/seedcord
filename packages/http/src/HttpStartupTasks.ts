import { StartupPhase } from '@seedcord/core';
import { attachmentsOf, COMMAND_DEPLOY_TIMEOUT_MS, CommandRegistry } from '@seedcord/core/internal';

import { EmojiInjector } from '#src/emojis/EmojiInjector';
import { publicKeyOf } from '#src/publicKey';

import type { Core } from '#interfaces/Core';
import type { InteractionsService } from '#src/InteractionsService';
import type { HmrManager } from '@seedcord/core/internal';

type Host = Core & Parameters<typeof attachmentsOf>[0];

// the startup tasks the node bot and the edge bot under seedcord dev share
export class HttpStartupTasks {
    private readonly commands: CommandRegistry | undefined;
    private readonly emojis: EmojiInjector;

    public constructor(
        private readonly host: Host,
        private readonly service: InteractionsService
    ) {
        this.commands = host.config.bot.commands.path ? new CommandRegistry(host) : undefined;
        this.emojis = new EmojiInjector(host);
    }

    // a Configuration task because plugins attach after the constructor runs
    public registerHmr(hmr: HmrManager): void {
        this.host.startup.addTask(StartupPhase.Configuration, 'hmr-registration', () => {
            if (this.service.interactions) hmr.register(this.service.interactions);
            if (this.commands) hmr.register(this.commands);
            hmr.register(this.service.subscribers);
            for (const { instance } of attachmentsOf(this.host)) hmr.register(instance);
            return Promise.resolve();
        });
    }

    // a deployed edge worker reads the key and ids seedcord build baked
    public addDiscordTasks(): void {
        const { startup } = this.host;
        startup.addTask(StartupPhase.Login, 'interactions-engine', async () => {
            this.service.prepareEngine(await publicKeyOf(this.service.rest));
        });

        const { commands } = this;
        if (!commands) {
            startup.addTask(StartupPhase.Login, 'emoji-injection', () => this.emojis.init());
            return;
        }
        startup.addTask(
            StartupPhase.Login,
            'command-deploy',
            async (signal) => {
                await this.emojis.init();
                await commands.deploy(signal, { routes: this.service.interactions });
            },
            COMMAND_DEPLOY_TIMEOUT_MS
        );
    }
}
