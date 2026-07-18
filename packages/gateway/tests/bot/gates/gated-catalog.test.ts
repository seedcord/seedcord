import {
    and,
    Cooldown,
    CustomId,
    GuildOnly,
    or,
    OwnerOnly,
    ModalRoute,
    RequireBotPermissions,
    RequirePermissions,
    RequireRole
} from '@seedcord/core';
import { GatedMetadataKey } from '@seedcord/core/internal';
import { PermissionFlagsBits } from 'discord.js';
import { describe, expect, it } from 'vitest';

import { Gated } from '@bDecorators/Gated';
import { IgnoreBots, Nsfw } from '@bot/gates';
import { EventHandler } from '@handlers/event';
import { AutocompleteHandler } from '@handlers/interaction/AutocompleteHandler';
import { ModalHandler } from '@handlers/interaction/components';
import { SlashHandler } from '@handlers/interaction/SlashHandler';

import type { Events } from 'discord.js';

declare module '@seedcord/core' {
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
        expect((Reflect.getMetadata(GatedMetadataKey, Handler) as unknown[]).length).toBe(1);
    });

    it('attaches the channel-scoped RequirePermissions to a modal handler', () => {
        @Gated(RequirePermissions([PermissionFlagsBits.BanMembers]))
        @ModalRoute(ModalProbeId)
        class Handler extends ModalHandler<[typeof ModalProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('attaches the channel-scoped RequirePermissions to an event handler', () => {
        @Gated(RequirePermissions([PermissionFlagsBits.BanMembers]))
        class Handler extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('attaches the guild-scoped RequirePermissions to a slash and an event handler', () => {
        @Gated(RequirePermissions([PermissionFlagsBits.BanMembers], { in: 'guild' }))
        class Slash extends SlashHandler<'catalogprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }
        @Gated(RequirePermissions([PermissionFlagsBits.BanMembers], { in: 'guild' }))
        class Event extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Slash).toBeDefined();
        expect(Event).toBeDefined();
    });

    it('rejects RequirePermissions on an autocomplete handler', () => {
        // @ts-expect-error autocomplete handlers take no gates, a refusal has no reply target there
        @Gated(RequirePermissions([PermissionFlagsBits.BanMembers]))
        class Handler extends AutocompleteHandler<'catalogprobe'> {
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

    it('attaches RequireBotPermissions to a modal and an event handler', () => {
        @Gated(RequireBotPermissions([PermissionFlagsBits.BanMembers]))
        @ModalRoute(ModalProbeId)
        class Modal extends ModalHandler<[typeof ModalProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }
        @Gated(RequireBotPermissions([PermissionFlagsBits.BanMembers]))
        class Event extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Modal).toBeDefined();
        expect(Event).toBeDefined();
    });

    it('rejects RequireBotPermissions on an autocomplete handler', () => {
        // @ts-expect-error autocomplete handlers take no gates, a refusal has no reply target there
        @Gated(RequireBotPermissions([PermissionFlagsBits.BanMembers]))
        class Handler extends AutocompleteHandler<'catalogprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('attaches RequireRole to a modal and an event handler', () => {
        @Gated(RequireRole('123456789012345678'))
        @ModalRoute(ModalProbeId)
        class Modal extends ModalHandler<[typeof ModalProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }
        @Gated(RequireRole('123456789012345678'))
        class Event extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Modal).toBeDefined();
        expect(Event).toBeDefined();
    });

    it('rejects RequireRole on an autocomplete handler', () => {
        // @ts-expect-error autocomplete handlers take no gates, a refusal has no reply target there
        @Gated(RequireRole('123456789012345678'))
        class Handler extends AutocompleteHandler<'catalogprobe'> {
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
    it('accepts and(agnostic, RequirePermissions) on a slash and a modal handler', () => {
        @Gated(and(GuildOnly(), RequirePermissions([PermissionFlagsBits.BanMembers])))
        class Slash extends SlashHandler<'catalogprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }
        @Gated(and(GuildOnly(), RequirePermissions([PermissionFlagsBits.BanMembers])))
        @ModalRoute(ModalProbeId)
        class Modal extends ModalHandler<[typeof ModalProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Slash).toBeDefined();
        expect(Modal).toBeDefined();
    });

    it('rejects and(agnostic, RequirePermissions) on an autocomplete handler', () => {
        // @ts-expect-error autocomplete handlers take no gates, a refusal has no reply target there
        @Gated(and(GuildOnly(), RequirePermissions([PermissionFlagsBits.BanMembers])))
        class Handler extends AutocompleteHandler<'catalogprobe'> {
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

    it('rejects and(event-only, agnostic-permission) on a slash handler', () => {
        // @ts-expect-error IgnoreBots is event-only, so the and fits no interaction handler
        @Gated(and(IgnoreBots, RequirePermissions([PermissionFlagsBits.BanMembers])))
        class Handler extends SlashHandler<'catalogprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });
});
