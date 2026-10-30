import { expectTypeOf } from 'vite-plus/test';

import { InteractionMiddleware } from '#handlers/interaction/index';

import type { InteractionKind } from '@seedcord/core';
import type { ButtonInteraction, ChatInputCommandInteraction, ModalSubmitInteraction } from 'discord.js';

class ButtonOnly extends InteractionMiddleware<InteractionKind.Button> {
    public execute(): Promise<void> {
        expectTypeOf(this.event).toEqualTypeOf<ButtonInteraction>();
        return Promise.resolve();
    }
}
void ButtonOnly;

class SlashOnly extends InteractionMiddleware<InteractionKind.Slash> {
    public execute(): Promise<void> {
        expectTypeOf(this.event).toEqualTypeOf<ChatInputCommandInteraction>();
        return Promise.resolve();
    }
}
void SlashOnly;

class TwoKinds extends InteractionMiddleware<InteractionKind.Button | InteractionKind.Modal> {
    public execute(): Promise<void> {
        expectTypeOf(this.event).toEqualTypeOf<ButtonInteraction | ModalSubmitInteraction>();
        // discord.js ships the guard that narrows the union
        if (this.event.isButton()) expectTypeOf(this.event).toEqualTypeOf<ButtonInteraction>();
        return Promise.resolve();
    }
}
void TwoKinds;

class Catchall extends InteractionMiddleware {
    public execute(): Promise<void> {
        // every repliable kind shares the BaseInteraction members
        expectTypeOf(this.event.user.id).toEqualTypeOf<string>();
        if (this.event.isChatInputCommand()) expectTypeOf(this.event).toEqualTypeOf<ChatInputCommandInteraction>();
        return Promise.resolve();
    }
}
void Catchall;

// autocomplete carries no reply target
// @ts-expect-error Autocomplete is not a middleware kind
class NotAutocomplete extends InteractionMiddleware<InteractionKind.Autocomplete> {
    public execute(): Promise<void> {
        return Promise.resolve();
    }
}
void NotAutocomplete;
