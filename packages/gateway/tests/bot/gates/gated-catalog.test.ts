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

import { Gated } from '#bDecorators/Gated';
import { IgnoreBots, Nsfw } from '#bot/gates';
import { EventHandler } from '#handlers/event';
import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';
import { ModalHandler } from '#handlers/interaction/components';
import { SlashHandler } from '#handlers/interaction/SlashHandler';

import type { Events } from 'discord.js';

declare module '@seedcord/core' {
    interface SlashOptionRegistry {
        catalogprobe: { note: { kind: 'string'; required: false } };
    }
}

const ModalProbeId = new CustomId('catalogmodal').str('x');

@Gated(OwnerOnly())
class AttachesAgnosticCatalogGate extends SlashHandler<'catalogprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
@Gated(Cooldown(5))
class AttachesAgnosticCatalogGate2 extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AttachesAgnosticCatalogGate;
void AttachesAgnosticCatalogGate2;

@Gated(RequirePermissions([PermissionFlagsBits.BanMembers]))
@ModalRoute(ModalProbeId)
class AttachesChannelScopedRequirePermissions extends ModalHandler<[typeof ModalProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AttachesChannelScopedRequirePermissions;

@Gated(RequirePermissions([PermissionFlagsBits.BanMembers]))
class AttachesChannelScopedRequirePermissions2 extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AttachesChannelScopedRequirePermissions2;

@Gated(RequirePermissions([PermissionFlagsBits.BanMembers], { in: 'guild' }))
class AttachesGuildScopedRequirePermissions extends SlashHandler<'catalogprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
@Gated(RequirePermissions([PermissionFlagsBits.BanMembers], { in: 'guild' }))
class AttachesGuildScopedRequirePermissions2 extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AttachesGuildScopedRequirePermissions;
void AttachesGuildScopedRequirePermissions2;

// @ts-expect-error autocomplete handlers take no gates, a refusal has no reply target there
@Gated(RequirePermissions([PermissionFlagsBits.BanMembers]))
class RejectsRequirePermissionsAutocomplete extends AutocompleteHandler<'catalogprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsRequirePermissionsAutocomplete;

// @ts-expect-error Nsfw excludes ModalSubmit, which has no reliable channel
@Gated(Nsfw())
@ModalRoute(ModalProbeId)
class RejectsNsfwModalHandler extends ModalHandler<[typeof ModalProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsNsfwModalHandler;

@Gated(RequireBotPermissions([PermissionFlagsBits.BanMembers]))
@ModalRoute(ModalProbeId)
class AttachesRequireBotPermissions extends ModalHandler<[typeof ModalProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
@Gated(RequireBotPermissions([PermissionFlagsBits.BanMembers]))
class AttachesRequireBotPermissions2 extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AttachesRequireBotPermissions;
void AttachesRequireBotPermissions2;

// @ts-expect-error autocomplete handlers take no gates, a refusal has no reply target there
@Gated(RequireBotPermissions([PermissionFlagsBits.BanMembers]))
class RejectsRequireBotPermissions extends AutocompleteHandler<'catalogprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsRequireBotPermissions;

@Gated(RequireRole('123456789012345678'))
@ModalRoute(ModalProbeId)
class AttachesRequireRoleModalEvent extends ModalHandler<[typeof ModalProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
@Gated(RequireRole('123456789012345678'))
class AttachesRequireRoleModalEvent2 extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AttachesRequireRoleModalEvent;
void AttachesRequireRoleModalEvent2;

// @ts-expect-error autocomplete handlers take no gates, a refusal has no reply target there
@Gated(RequireRole('123456789012345678'))
class RejectsRequireRoleAutocomplete extends AutocompleteHandler<'catalogprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsRequireRoleAutocomplete;

@Gated(IgnoreBots)
class AttachesIgnoreBotsEventHandler extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AttachesIgnoreBotsEventHandler;

// @ts-expect-error IgnoreBots is event-only, a Silence on an interaction leaves "interaction failed"
@Gated(IgnoreBots)
class RejectsIgnoreBotsSlashHandler extends SlashHandler<'catalogprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsIgnoreBotsSlashHandler;

@Gated(and(GuildOnly(), RequirePermissions([PermissionFlagsBits.BanMembers])))
class AcceptsAgnosticRequirePermissions extends SlashHandler<'catalogprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
@Gated(and(GuildOnly(), RequirePermissions([PermissionFlagsBits.BanMembers])))
@ModalRoute(ModalProbeId)
class AcceptsAgnosticRequirePermissions2 extends ModalHandler<[typeof ModalProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsAgnosticRequirePermissions;
void AcceptsAgnosticRequirePermissions2;

// @ts-expect-error autocomplete handlers take no gates, a refusal has no reply target there
@Gated(and(GuildOnly(), RequirePermissions([PermissionFlagsBits.BanMembers])))
class RejectsAgnosticRequirePermissions extends AutocompleteHandler<'catalogprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsAgnosticRequirePermissions;

@Gated(or(OwnerOnly(), Cooldown(5)))
class AcceptsOrAgnosticAgnosticBoth extends SlashHandler<'catalogprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
@Gated(or(OwnerOnly(), Cooldown(5)))
class AcceptsOrAgnosticAgnosticBoth2 extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsOrAgnosticAgnosticBoth;
void AcceptsOrAgnosticAgnosticBoth2;

// @ts-expect-error IgnoreBots is event-only, so the and fits no interaction handler
@Gated(and(IgnoreBots, RequirePermissions([PermissionFlagsBits.BanMembers])))
class RejectsEventOnlyAgnosticPermission extends SlashHandler<'catalogprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsEventOnlyAgnosticPermission;

describe('@Gated catalog gates', () => {
    it('attaches RequirePermissions to a slash handler', () => {
        @Gated(RequirePermissions([PermissionFlagsBits.BanMembers]))
        class Handler extends SlashHandler<'catalogprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect((Reflect.getMetadata(GatedMetadataKey, Handler) as unknown[]).length).toBe(1);
    });
});
