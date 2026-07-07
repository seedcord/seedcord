import { and, CustomId, defineGate, or } from '@seedcord/core';
import { GatedMetadataKey } from '@seedcord/core/internal';
import { ApplicationCommandType } from 'discord.js';
import 'reflect-metadata';
import { describe, expect, it } from 'vitest';

import { Gated } from '@bDecorators/Gated';
import { ButtonRoute, ContextMenuRoute, ModalRoute, SelectMenuRoute, SelectMenuKind } from '@bDecorators/Interactions';
import { EventHandler } from '@handlers/event';
import { AutocompleteHandler } from '@handlers/interaction/AutocompleteHandler';
import { ButtonHandler, ModalHandler, SelectMenuHandler } from '@handlers/interaction/components';
import { ContextMenuHandler } from '@handlers/interaction/ContextMenuHandler';
import { SlashHandler } from '@handlers/interaction/SlashHandler';

import type { EventGateContext, InteractionGateContext } from '@bot/gates';
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
    interface SlashOptionRegistry {
        gateprobe: { note: { kind: 'string'; required: false } };
    }
    interface UserContextMenuRegistry {
        'Probe User': true;
    }
    interface MessageContextMenuRegistry {
        'Probe Message': true;
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

    it('accepts a gate whose context the handler provides', () => {
        @Gated(ButtonGate)
        @ButtonRoute(ProbeId)
        class Handler extends ButtonHandler<[typeof ProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects a gate that needs a context the handler does not provide', () => {
        // @ts-expect-error a button gate cannot attach to a slash handler
        @Gated(ButtonGate)
        class Handler extends SlashHandler<'gateprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects a stacked gate whose context the handler does not provide', () => {
        // @ts-expect-error SlashGate requires a slash interaction, so it cannot stack onto a button handler
        @Gated(ButtonGate, SlashGate)
        @ButtonRoute(ProbeId)
        class Handler extends ButtonHandler<[typeof ProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
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

    it('accepts a stack of gates the handler provides', () => {
        @Gated(AgnosticGate, ButtonGate)
        @ButtonRoute(ProbeId)
        class Handler extends ButtonHandler<[typeof ProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('accepts an or() when the handler matches one of its arms', () => {
        @Gated(or(ButtonGate, SlashGate))
        @ButtonRoute(ProbeId)
        class Handler extends ButtonHandler<[typeof ProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('accepts a nested or(and(...)) the handler satisfies', () => {
        @Gated(or(and(AgnosticGate, ButtonGate), SlashGate))
        @ButtonRoute(ProbeId)
        class Handler extends ButtonHandler<[typeof ProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects an or() when the handler matches none of its arms', () => {
        // @ts-expect-error neither a button nor a slash gate fits an event handler
        @Gated(or(ButtonGate, SlashGate))
        class Handler extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('accepts an agnostic gate on an event handler', () => {
        @Gated(AgnosticGate)
        class Handler extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('accepts an event gate on the matching event handler', () => {
        @Gated(MessageGate)
        class Handler extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects an event gate on an interaction handler', () => {
        // @ts-expect-error a message-event gate cannot attach to a slash handler
        @Gated(MessageGate)
        class Handler extends SlashHandler<'gateprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects an interaction gate on an event handler', () => {
        // @ts-expect-error a button gate cannot attach to an event handler
        @Gated(ButtonGate)
        class Handler extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects any gate on an autocomplete handler', () => {
        // @ts-expect-error autocomplete handlers take no gates, a refusal has no reply target there
        @Gated(AgnosticGate)
        class Handler extends AutocompleteHandler<'gateprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects @Gated with no gates', () => {
        // @ts-expect-error @Gated requires at least one gate
        @Gated()
        @ButtonRoute(ProbeId)
        class Handler extends ButtonHandler<[typeof ProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });
});

describe('@Gated combinator coverage', () => {
    it('accepts or(interaction, event) on the event arm', () => {
        @Gated(or(ButtonGate, MessageGate))
        class Handler extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('accepts or(interaction, event) on the interaction arm', () => {
        @Gated(or(ButtonGate, MessageGate))
        @ButtonRoute(ProbeId)
        class Handler extends ButtonHandler<[typeof ProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects or(interaction, event) on a handler matching neither arm', () => {
        // @ts-expect-error a slash handler matches neither the button nor the event arm
        @Gated(or(ButtonGate, MessageGate))
        class Handler extends SlashHandler<'gateprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects uninhabitable and(interaction, event) on the interaction handler', () => {
        // @ts-expect-error and(button, message) requires a context that is both an interaction and an event
        @Gated(and(ButtonGate, MessageGate))
        @ButtonRoute(ProbeId)
        class Handler extends ButtonHandler<[typeof ProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects uninhabitable and(interaction, event) on the event handler', () => {
        // @ts-expect-error and(button, message) requires a context that is both an interaction and an event
        @Gated(and(ButtonGate, MessageGate))
        class Handler extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects uninhabitable and(button, slash) on a button handler', () => {
        // @ts-expect-error and(button, slash) requires an interaction that is both kinds
        @Gated(and(ButtonGate, SlashGate))
        @ButtonRoute(ProbeId)
        class Handler extends ButtonHandler<[typeof ProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('accepts or(and(...), and(...)) when one inhabitable arm matches', () => {
        @Gated(or(and(AgnosticGate, ButtonGate), and(AgnosticGate, SlashGate)))
        @ButtonRoute(ProbeId)
        class Handler extends ButtonHandler<[typeof ProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('accepts or(and(agnostic, button), slash) on a slash handler via the other arm', () => {
        @Gated(or(and(AgnosticGate, ButtonGate), SlashGate))
        class Handler extends SlashHandler<'gateprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('accepts stacked ors when the handler satisfies every or', () => {
        @Gated(or(ButtonGate, SlashGate), or(ButtonGate, ModalGate))
        @ButtonRoute(ProbeId)
        class Handler extends ButtonHandler<[typeof ProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects stacked ors when the second or has no matching arm', () => {
        // @ts-expect-error a button handler satisfies the first or but not the second
        @Gated(or(ButtonGate, SlashGate), or(SlashGate, ModalGate))
        @ButtonRoute(ProbeId)
        class Handler extends ButtonHandler<[typeof ProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });
});

describe('@Gated kind coverage', () => {
    it('accepts a modal gate on a modal handler', () => {
        @Gated(ModalGate)
        @ModalRoute(ModalProbeId)
        class Handler extends ModalHandler<[typeof ModalProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('accepts a user-select gate on a user-select handler', () => {
        @Gated(UserSelectGate)
        @SelectMenuRoute(SelectMenuKind.User, SelectProbeId)
        class Handler extends SelectMenuHandler<SelectMenuKind.User, [typeof SelectProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('accepts a user-menu gate on a user context-menu handler', () => {
        @Gated(UserMenuGate)
        @ContextMenuRoute(ApplicationCommandType.User, 'Probe User')
        class Handler extends ContextMenuHandler<ApplicationCommandType.User> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('accepts a message-menu gate on a message context-menu handler', () => {
        @Gated(MessageMenuGate)
        @ContextMenuRoute(ApplicationCommandType.Message, 'Probe Message')
        class Handler extends ContextMenuHandler<ApplicationCommandType.Message> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects a modal gate on a button handler', () => {
        // @ts-expect-error a modal gate cannot attach to a button handler
        @Gated(ModalGate)
        @ButtonRoute(ProbeId)
        class Handler extends ButtonHandler<[typeof ProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects a user-menu gate on a message context-menu handler', () => {
        // @ts-expect-error the two context-menu kinds do not interchange
        @Gated(UserMenuGate)
        @ContextMenuRoute(ApplicationCommandType.Message, 'Probe Message')
        class Handler extends ContextMenuHandler<ApplicationCommandType.Message> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects a user-select gate on a string-select handler', () => {
        // @ts-expect-error the two select kinds do not interchange
        @Gated(UserSelectGate)
        @SelectMenuRoute(SelectMenuKind.String, SelectProbeId)
        class Handler extends SelectMenuHandler<SelectMenuKind.String, [typeof SelectProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('accepts a generic interaction gate on a button handler', () => {
        @Gated(AnyInteractionGate)
        @ButtonRoute(ProbeId)
        class Handler extends ButtonHandler<[typeof ProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects a generic interaction gate on an event handler', () => {
        // @ts-expect-error an interaction gate cannot attach to an event handler
        @Gated(AnyInteractionGate)
        class Handler extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects an event gate on a handler for a different event', () => {
        // @ts-expect-error a messageCreate gate cannot attach to a guildMemberAdd handler
        @Gated(MessageGate)
        class Handler extends EventHandler<Events.GuildMemberAdd> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects a narrow event gate on a wider multi-event handler', () => {
        // @ts-expect-error the handler can fire messageUpdate, which the gate does not cover
        @Gated(MessageGate)
        class Handler extends EventHandler<Events.MessageCreate | Events.MessageUpdate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('accepts a wide event gate on a narrower single-event handler', () => {
        @Gated(WideGate)
        class Handler extends EventHandler<Events.MessageCreate> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects a 3-gate stack on the middle wrong-kind gate', () => {
        // @ts-expect-error the modal gate in the middle does not fit a button handler
        @Gated(AgnosticGate, ModalGate, ButtonGate)
        @ButtonRoute(ProbeId)
        class Handler extends ButtonHandler<[typeof ProbeId]> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects an own-kind gate on an autocomplete handler', () => {
        // @ts-expect-error autocomplete handlers take no gates
        @Gated(SlashGate)
        class Handler extends AutocompleteHandler<'gateprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });

    it('rejects an or() on an autocomplete handler', () => {
        // @ts-expect-error autocomplete handlers take no gates
        @Gated(or(ButtonGate, SlashGate))
        class Handler extends AutocompleteHandler<'gateprobe'> {
            async execute(): Promise<void> {
                await Promise.resolve();
            }
        }

        expect(Handler).toBeDefined();
    });
});
