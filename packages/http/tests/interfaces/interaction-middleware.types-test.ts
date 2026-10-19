import { InteractionType } from 'discord-api-types/v10';
import { expectTypeOf } from 'vite-plus/test';

import { InteractionMiddleware } from '#handlers/interaction';

import type { InteractionKind } from '@seedcord/core';
import type {
    APIChatInputApplicationCommandInteraction,
    APIMessageComponentButtonInteraction,
    APIModalSubmitInteraction
} from 'discord-api-types/v10';

class ButtonOnly extends InteractionMiddleware<InteractionKind.Button> {
    public execute(): Promise<void> {
        expectTypeOf(this.event).toEqualTypeOf<APIMessageComponentButtonInteraction>();
        return Promise.resolve();
    }
}
void ButtonOnly;

class SlashOnly extends InteractionMiddleware<InteractionKind.Slash> {
    public execute(): Promise<void> {
        expectTypeOf(this.event).toEqualTypeOf<APIChatInputApplicationCommandInteraction>();
        return Promise.resolve();
    }
}
void SlashOnly;

class TwoKinds extends InteractionMiddleware<InteractionKind.Button | InteractionKind.Modal> {
    public execute(): Promise<void> {
        expectTypeOf(this.event).toEqualTypeOf<APIMessageComponentButtonInteraction | APIModalSubmitInteraction>();
        // the raw payload carries no guards
        if (this.event.type === InteractionType.ModalSubmit) {
            expectTypeOf(this.event).toEqualTypeOf<APIModalSubmitInteraction>();
        }
        return Promise.resolve();
    }
}
void TwoKinds;

class Catchall extends InteractionMiddleware {
    public execute(): Promise<void> {
        // every repliable kind carries the base interaction fields
        expectTypeOf(this.event.id).toEqualTypeOf<string>();
        if (this.event.type === InteractionType.ModalSubmit) {
            expectTypeOf(this.event).toEqualTypeOf<APIModalSubmitInteraction>();
        }
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
