import { CustomId } from '@seedcord/kit';
import { PermissionFlagsBits } from 'discord.js';
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';

import { Gated } from '@bDecorators/Gated';
import { ModalRoute } from '@bDecorators/Interactions';
import {
    and,
    Cooldown,
    GuildOnly,
    IgnoreBots,
    Nsfw,
    or,
    OwnerOnly,
    RequireBotPermissions,
    RequirePermissions
} from '@bot/gates';
import { EventHandler } from '@handlers/event';
import { ModalHandler } from '@handlers/interaction/components';
import { SlashHandler } from '@handlers/interaction/SlashHandler';

import type { Events } from 'discord.js';

declare module '@seedcord/types' {
    interface SlashOptionRegistry {
        catalogprobe: { note: { kind: 'string'; required: false } };
    }
}

const ModalProbeId = new CustomId('catalogmodal').str('x');

describe('@Gated catalog gates', () => {
    it('attaches an agnostic catalog gate to a slash and an event handler', () => {
        @Gated(OwnerOnly())
        class Slash extends SlashHandler<'catalogprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }
        @Gated(Cooldown(5))
        class Event extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Slash).toBeDefined();
        expect(Event).toBeDefined();
    });

    it('attaches RequirePermissions to a slash handler', () => {
        @Gated(RequirePermissions([PermissionFlagsBits.BanMembers]))
        class Handler extends SlashHandler<'catalogprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects RequirePermissions on a modal handler', () => {
        // @ts-expect-error a permission gate excludes ModalSubmit, which lacks a reliable cached member
        @Gated(RequirePermissions([PermissionFlagsBits.BanMembers]))
        @ModalRoute(ModalProbeId)
        class Handler extends ModalHandler<[typeof ModalProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects RequirePermissions on an event handler', () => {
        // @ts-expect-error a permission gate is interaction-only
        @Gated(RequirePermissions([PermissionFlagsBits.BanMembers]))
        class Handler extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects Nsfw on a modal handler', () => {
        // @ts-expect-error Nsfw excludes ModalSubmit, which has no reliable channel
        @Gated(Nsfw())
        @ModalRoute(ModalProbeId)
        class Handler extends ModalHandler<[typeof ModalProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('attaches RequireBotPermissions to a modal handler', () => {
        @Gated(RequireBotPermissions([PermissionFlagsBits.BanMembers]))
        @ModalRoute(ModalProbeId)
        class Handler extends ModalHandler<[typeof ModalProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects RequireBotPermissions on an event handler', () => {
        // @ts-expect-error RequireBotPermissions is interaction-only
        @Gated(RequireBotPermissions([PermissionFlagsBits.BanMembers]))
        class Handler extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('attaches IgnoreBots to an event handler', () => {
        @Gated(IgnoreBots)
        class Handler extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects IgnoreBots on a slash handler', () => {
        // @ts-expect-error IgnoreBots is event-only, a Silence on an interaction leaves "interaction failed"
        @Gated(IgnoreBots)
        class Handler extends SlashHandler<'catalogprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });
});

describe('@Gated catalog gate combinators', () => {
    it('accepts and(agnostic, interaction-only) on a slash handler', () => {
        @Gated(and(GuildOnly(), RequirePermissions([PermissionFlagsBits.BanMembers])))
        class Handler extends SlashHandler<'catalogprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects and(agnostic, RequirePermissions) on a modal handler', () => {
        // @ts-expect-error RequirePermissions in the and excludes ModalSubmit
        @Gated(and(GuildOnly(), RequirePermissions([PermissionFlagsBits.BanMembers])))
        @ModalRoute(ModalProbeId)
        class Handler extends ModalHandler<[typeof ModalProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('accepts or(agnostic, agnostic) on both a slash and an event handler', () => {
        @Gated(or(OwnerOnly(), Cooldown(5)))
        class Slash extends SlashHandler<'catalogprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }
        @Gated(or(OwnerOnly(), Cooldown(5)))
        class Event extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Slash).toBeDefined();
        expect(Event).toBeDefined();
    });

    it('rejects and(event-only, interaction-only) as uninhabitable', () => {
        // @ts-expect-error IgnoreBots is event-only and RequirePermissions interaction-only, the and fits nothing
        @Gated(and(IgnoreBots, RequirePermissions([PermissionFlagsBits.BanMembers])))
        class Handler extends SlashHandler<'catalogprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });
});
