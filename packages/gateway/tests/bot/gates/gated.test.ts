import {
    and,
    CustomId,
    defineGate,
    or,
    SelectMenuKind,
    ButtonRoute,
    UserContextMenuRoute,
    MessageContextMenuRoute,
    ModalRoute,
    SelectMenuRoute
} from '@seedcord/core';
import { GatedMetadataKey } from '@seedcord/core/internal';
import { describe, expect, it } from 'vitest';

import { Gated } from '#bDecorators/Gated';
import { EventHandler } from '#handlers/event';
import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';
import { ButtonHandler, ModalHandler, SelectMenuHandler } from '#handlers/interaction/components';
import { UserContextMenuHandler, MessageContextMenuHandler } from '#handlers/interaction/ContextMenuHandler';
import { SlashHandler } from '#handlers/interaction/SlashHandler';

import type { EventGateContext, InteractionGateContext } from '#bot/gates';
import type {
    ButtonInteraction,
    ChatInputCommandInteraction,
    Events,
    MessageContextMenuCommandInteraction,
    ModalSubmitInteraction,
    UserContextMenuCommandInteraction,
    UserSelectMenuInteraction
} from 'discord.js';

declare module '@seedcord/core' {
    interface SlashRegistry {
        gateprobe: { options: { note: { kind: 'string'; required: false } }; cache: 'cached' };
    }
    interface UserContextMenuRegistry {
        'Probe User': { cache: 'cached' };
    }
    interface MessageContextMenuRegistry {
        'Probe Message': { cache: 'cached' };
    }
}

const ProbeId = new CustomId('probe').str('x');

const ButtonGate = defineGate('btn', (ctx: InteractionGateContext<ButtonInteraction>) => {
    void ctx.interaction;
});
const SlashGate = defineGate('slash', (ctx: InteractionGateContext<ChatInputCommandInteraction>) => {
    void ctx.interaction;
});
const AgnosticGate = defineGate('owner', () => {});
const MessageGate = defineGate('msg', (ctx: EventGateContext<Events.MessageCreate>) => {
    void ctx.payload;
});
const WideGate = defineGate('wide', (ctx: EventGateContext<Events.MessageCreate | Events.MessageUpdate>) => {
    void ctx.payload;
});
const ModalGate = defineGate('modal', (ctx: InteractionGateContext<ModalSubmitInteraction>) => {
    void ctx.interaction;
});
const UserSelectGate = defineGate('userSelect', (ctx: InteractionGateContext<UserSelectMenuInteraction>) => {
    void ctx.interaction;
});
const UserMenuGate = defineGate('userMenu', (ctx: InteractionGateContext<UserContextMenuCommandInteraction>) => {
    void ctx.interaction;
});
const MessageMenuGate = defineGate('msgMenu', (ctx: InteractionGateContext<MessageContextMenuCommandInteraction>) => {
    void ctx.interaction;
});
const AnyInteractionGate = defineGate('anyIx', (ctx: InteractionGateContext) => {
    void ctx.interaction;
});
const ModalProbeId = new CustomId('modalprobe').str('x');
const SelectProbeId = new CustomId('selectprobe').str('x');

@Gated(ButtonGate)
@ButtonRoute(ProbeId)
class AcceptsGateWhoseContextHandler extends ButtonHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsGateWhoseContextHandler;

// @ts-expect-error a button gate cannot attach to a slash handler
@Gated(ButtonGate)
class RejectsGateNeedsContextHandler extends SlashHandler<'gateprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsGateNeedsContextHandler;

// @ts-expect-error SlashGate requires a slash interaction, so it cannot stack onto a button handler
@Gated(ButtonGate, SlashGate)
@ButtonRoute(ProbeId)
class RejectsStackedGateWhoseContext extends ButtonHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsStackedGateWhoseContext;

@Gated(AgnosticGate, ButtonGate)
@ButtonRoute(ProbeId)
class AcceptsStackGatesHandlerProvides extends ButtonHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsStackGatesHandlerProvides;

@Gated(or(ButtonGate, SlashGate))
@ButtonRoute(ProbeId)
class AcceptsOrWhenHandlerMatches extends ButtonHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsOrWhenHandlerMatches;

@Gated(or(and(AgnosticGate, ButtonGate), SlashGate))
@ButtonRoute(ProbeId)
class AcceptsNestedOrHandlerSatisfies extends ButtonHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsNestedOrHandlerSatisfies;

// @ts-expect-error neither a button nor a slash gate fits an event handler
@Gated(or(ButtonGate, SlashGate))
class RejectsOrWhenHandlerMatches extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsOrWhenHandlerMatches;

@Gated(AgnosticGate)
class AcceptsAgnosticGateEventHandler extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsAgnosticGateEventHandler;

@Gated(MessageGate)
class AcceptsEventGateMatchingEvent extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsEventGateMatchingEvent;

// @ts-expect-error a message-event gate cannot attach to a slash handler
@Gated(MessageGate)
class RejectsEventGateInteraction extends SlashHandler<'gateprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsEventGateInteraction;

// @ts-expect-error a button gate cannot attach to an event handler
@Gated(ButtonGate)
class RejectsInteractionGateEvent extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsInteractionGateEvent;

// @ts-expect-error autocomplete handlers take no gates, a refusal has no reply target there
@Gated(AgnosticGate)
class RejectsAnyGateAutocomplete extends AutocompleteHandler<'gateprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsAnyGateAutocomplete;

// @ts-expect-error @Gated requires at least one gate
@Gated()
@ButtonRoute(ProbeId)
class RejectsGatedNoGates extends ButtonHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsGatedNoGates;

@Gated(or(ButtonGate, MessageGate))
class AcceptsOrInteractionEventEvent extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsOrInteractionEventEvent;

@Gated(or(ButtonGate, MessageGate))
@ButtonRoute(ProbeId)
class AcceptsOrInteractionEventInteraction extends ButtonHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsOrInteractionEventInteraction;

// @ts-expect-error a slash handler matches neither the button nor the event arm
@Gated(or(ButtonGate, MessageGate))
class RejectsOrInteractionEventHandler extends SlashHandler<'gateprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsOrInteractionEventHandler;

// @ts-expect-error and(button, message) requires a context that is both an interaction and an event
@Gated(and(ButtonGate, MessageGate))
@ButtonRoute(ProbeId)
class RejectsUninhabitableInteraction extends ButtonHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsUninhabitableInteraction;

// @ts-expect-error and(button, message) requires a context that is both an interaction and an event
@Gated(and(ButtonGate, MessageGate))
class RejectsUninhabitableInteraction2 extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsUninhabitableInteraction2;

// @ts-expect-error and(button, slash) requires an interaction that is both kinds
@Gated(and(ButtonGate, SlashGate))
@ButtonRoute(ProbeId)
class RejectsUninhabitableButton extends ButtonHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsUninhabitableButton;

@Gated(or(and(AgnosticGate, ButtonGate), and(AgnosticGate, SlashGate)))
@ButtonRoute(ProbeId)
class AcceptsOrWhenOneInhabitable extends ButtonHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsOrWhenOneInhabitable;

@Gated(or(and(AgnosticGate, ButtonGate), SlashGate))
class AcceptsOrAgnosticButtonSlash extends SlashHandler<'gateprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsOrAgnosticButtonSlash;

@Gated(or(ButtonGate, SlashGate), or(ButtonGate, ModalGate))
@ButtonRoute(ProbeId)
class AcceptsStackedOrsWhenHandler extends ButtonHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsStackedOrsWhenHandler;

// @ts-expect-error a button handler satisfies the first or but not the second
@Gated(or(ButtonGate, SlashGate), or(SlashGate, ModalGate))
@ButtonRoute(ProbeId)
class RejectsStackedOrsWhenSecond extends ButtonHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsStackedOrsWhenSecond;

@Gated(ModalGate)
@ModalRoute(ModalProbeId)
class AcceptsModalGateModalHandler extends ModalHandler<[typeof ModalProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsModalGateModalHandler;

@Gated(UserSelectGate)
@SelectMenuRoute(SelectMenuKind.User, SelectProbeId)
class AcceptsUserSelectGateUserSelect extends SelectMenuHandler<SelectMenuKind.User, [typeof SelectProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsUserSelectGateUserSelect;

@Gated(UserMenuGate)
@UserContextMenuRoute('Probe User')
class AcceptsUserMenuGateUserContext extends UserContextMenuHandler<'Probe User'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsUserMenuGateUserContext;

@Gated(MessageMenuGate)
@MessageContextMenuRoute('Probe Message')
class AcceptsMessageMenuGateMessage extends MessageContextMenuHandler<'Probe Message'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsMessageMenuGateMessage;

// @ts-expect-error a modal gate cannot attach to a button handler
@Gated(ModalGate)
@ButtonRoute(ProbeId)
class RejectsModalGateButtonHandler extends ButtonHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsModalGateButtonHandler;

// @ts-expect-error the two context-menu kinds do not interchange
@Gated(UserMenuGate)
@MessageContextMenuRoute('Probe Message')
class RejectsUserMenuGateMessage extends MessageContextMenuHandler<'Probe Message'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsUserMenuGateMessage;

// @ts-expect-error the two select kinds do not interchange
@Gated(UserSelectGate)
@SelectMenuRoute(SelectMenuKind.String, SelectProbeId)
class RejectsUserSelectGateString extends SelectMenuHandler<SelectMenuKind.String, [typeof SelectProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsUserSelectGateString;

@Gated(AnyInteractionGate)
@ButtonRoute(ProbeId)
class AcceptsGenericInteractionGate extends ButtonHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsGenericInteractionGate;

// @ts-expect-error an interaction gate cannot attach to an event handler
@Gated(AnyInteractionGate)
class RejectsGenericInteractionGate extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsGenericInteractionGate;

// @ts-expect-error a messageCreate gate cannot attach to a guildMemberAdd handler
@Gated(MessageGate)
class RejectsEventGateHandlerFor extends EventHandler<Events.GuildMemberAdd> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsEventGateHandlerFor;

// @ts-expect-error the handler can fire messageUpdate, which the gate does not cover
@Gated(MessageGate)
class RejectsNarrowEventGateWider extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsNarrowEventGateWider;

@Gated(WideGate)
class AcceptsWideEventGateNarrower extends EventHandler<Events.MessageCreate> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void AcceptsWideEventGateNarrower;

// @ts-expect-error the modal gate in the middle does not fit a button handler
@Gated(AgnosticGate, ModalGate, ButtonGate)
@ButtonRoute(ProbeId)
class Rejects3GateStackMiddleWrong extends ButtonHandler<[typeof ProbeId]> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void Rejects3GateStackMiddleWrong;

// @ts-expect-error autocomplete handlers take no gates
@Gated(SlashGate)
class RejectsOwnKindGateAutocomplete extends AutocompleteHandler<'gateprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsOwnKindGateAutocomplete;

// @ts-expect-error autocomplete handlers take no gates
@Gated(or(ButtonGate, SlashGate))
class RejectsOrAutocompleteHandler extends AutocompleteHandler<'gateprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }
}
void RejectsOrAutocompleteHandler;

describe('@Gated', () => {
    it('stores its gates in metadata on the handler class', () => {
        @Gated(AgnosticGate)
        class Handler extends SlashHandler<'gateprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Reflect.getMetadata(GatedMetadataKey, Handler)).toEqual([AgnosticGate]);
    });

    it('stores stacked gates in order in metadata', () => {
        @Gated(AgnosticGate, ButtonGate)
        @ButtonRoute(ProbeId)
        class Handler extends ButtonHandler<[typeof ProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Reflect.getMetadata(GatedMetadataKey, Handler)).toEqual([AgnosticGate, ButtonGate]);
    });
});
