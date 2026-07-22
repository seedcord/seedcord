import type { AutocompleteHandler } from '@handlers/interaction/AutocompleteHandler';
import type { InteractionHandler } from '@handlers/interaction/InteractionHandler';
import type { TypedConstructor } from '@seedcord/types';

/** @internal */
export type HandlerConstructor = TypedConstructor<typeof InteractionHandler | typeof AutocompleteHandler>;
